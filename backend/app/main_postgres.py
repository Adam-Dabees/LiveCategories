from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum
from typing import Dict, List, Set, Optional
import json, time, asyncio, random, string
from datetime import datetime
from .api_service import api_service
from .db_service import db_service
from .database import get_db, create_tables
from .config import settings
from .auth import router as auth_router
from sqlalchemy.orm import Session

app = FastAPI(title="LiveCategories - PostgreSQL Edition")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth_router)

# ----- Helper functions

def generate_lobby_code(length=6):
    """Generate a unique lobby code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

# ----- Game types

class Phase(str, Enum):
    LOBBY = "lobby"
    BIDDING = "bidding"
    LISTING = "listing"
    SUMMARY = "summary"
    ENDED = "ended"

# ----- In-memory stores (for WebSocket connections only)
ROOMS: Dict[str, List[WebSocket]] = {}  # game_id -> sockets
TICK_TASKS: Dict[str, asyncio.Task] = {}

# ----- Helpers

def now() -> float:
    return time.time()

async def broadcast(game_id: str, message: dict):
    for ws in ROOMS.get(game_id, []):
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            pass

def normalize(s: str) -> str:
    return " ".join(s.lower().strip().split())

def game_snapshot(game, players, scores) -> dict:
    return {
        "id": game.id,
        "lobbyCode": game.lobby_code,
        "phase": game.phase,
        "bestOf": game.best_of,
        "round": game.round_number,
        "players": {p.id: {"id": p.id, "name": p.name, "connected": p.connected} for p in players},
        "scores": scores,
        "category": game.category,
        "highBid": game.high_bid,
        "highBidderId": game.high_bidder_id,
        "listerId": game.lister_id,
        "listCount": game.list_count,
        "phaseEndsAt": game.phase_ends_at.timestamp() if game.phase_ends_at else None,
    }

def ensure_game(game_id: str) -> dict:
    """Get or create game from database"""
    game = db_service.get_game(game_id)
    if not game:
        game = db_service.create_game(game_id, settings.DEFAULT_BEST_OF)
        ROOMS[game_id] = []
    return game

async def load_category(name: str) -> Set[str]:
    """Load category items from API or database cache"""
    # Check cache first
    cached_items = db_service.get_cached_category_items(name)
    if cached_items:
        return cached_items
    
    try:
        if name == "programming_languages":
            items = await api_service.get_programming_languages()
        elif name == "countries":
            items = await api_service.get_countries()
        elif name == "animals":
            items = await api_service.get_animals()
        elif name == "fruits":
            # Keep fruits as static for now
            import pathlib
            p = pathlib.Path(__file__).parent / "categories" / "fruits.json"
            items = set(json.loads(p.read_text()))
        else:
            items = set()
        
        # Cache the results
        if items:
            db_service.cache_category_items(name, items, settings.CACHE_TTL_MINUTES)
        
        return items
    except Exception as e:
        print(f"Error loading category {name}: {e}")
        return set()

def start_tick(game_id: str):
    if game_id in TICK_TASKS:
        return
    TICK_TASKS[game_id] = asyncio.create_task(tick_loop(game_id))

async def tick_loop(game_id: str):
    """Server-authoritative phase timer with database persistence"""
    while True:
        game = db_service.get_game(game_id)
        if not game:
            break
        if game.phase in (Phase.ENDED,):
            break
        
        if game.phase_ends_at and now() >= game.phase_ends_at.timestamp():
            # Advance phase
            if game.phase == Phase.BIDDING:
                # if no bids, seed lowest and pick random lister (first player)
                if not game.high_bidder_id:
                    players = db_service.get_players(game_id)
                    if players:
                        game.high_bid = 1
                        game.high_bidder_id = players[0].id
                        db_service.update_game(game_id, high_bid=1, high_bidder_id=players[0].id)
                
                game.lister_id = game.high_bidder_id
                db_service.update_game(game_id, 
                    phase=Phase.LISTING,
                    lister_id=game.high_bidder_id,
                    list_count=0,
                    phase_ends_at=datetime.fromtimestamp(now() + settings.LISTING_TIME_SECONDS)
                )
                db_service.clear_used_items(game_id)
                
                players = db_service.get_players(game_id)
                scores = db_service.get_all_scores(game_id)
                await broadcast(game_id, {"type": "state_update", "game": game_snapshot(game, players, scores)})
                
            elif game.phase == Phase.LISTING:
                # listing done -> scoring
                lister_hit = game.list_count >= game.high_bid
                lister = game.lister_id
                players = db_service.get_players(game_id)
                opponent = [p for p in players if p.id != lister][0] if len(players) == 2 else None
                winner = lister if lister_hit else (opponent.id if opponent else None)
                
                if winner:
                    current_score = db_service.get_player_score(game_id, winner)
                    db_service.update_player_score(game_id, winner, current_score + 1)
                
                db_service.update_game(game_id,
                    phase=Phase.SUMMARY,
                    phase_ends_at=datetime.fromtimestamp(now() + settings.SUMMARY_TIME_SECONDS)
                )
                
                players = db_service.get_players(game_id)
                scores = db_service.get_all_scores(game_id)
                await broadcast(game_id, {
                    "type": "round_result",
                    "winnerId": winner,
                    "listerHit": lister_hit,
                    "highBid": game.high_bid,
                    "game": game_snapshot(game, players, scores)
                })
                
            elif game.phase == Phase.SUMMARY:
                # next round or end match
                target = 1  # For single round games, end after 1 round
                scores = db_service.get_all_scores(game_id)
                
                if any(score >= target for score in scores.values()):
                    db_service.update_game(game_id, phase=Phase.ENDED, phase_ends_at=None)
                else:
                    # Keep the same category for the next round
                    category = game.category or "programming_languages"
                    db_service.update_game(game_id,
                        round_number=game.round_number + 1,
                        phase=Phase.BIDDING,
                        high_bid=0,
                        high_bidder_id=None,
                        lister_id=None,
                        category=category,
                        phase_ends_at=datetime.fromtimestamp(now() + settings.BIDDING_TIME_SECONDS)
                    )
                    
                    # Load category items
                    category_items = await load_category(category)
                    # Note: We don't store category_items in DB, they're loaded on demand
                
                players = db_service.get_players(game_id)
                scores = db_service.get_all_scores(game_id)
                await broadcast(game_id, {"type": "state_update", "game": game_snapshot(game, players, scores)})
        
        await asyncio.sleep(0.2)

# ----- WebSocket endpoint

@app.websocket("/ws/{game_id}")
async def ws_endpoint(websocket: WebSocket, game_id: str):
    # query params: ?playerId=abc&name=Adam
    player_id = websocket.query_params.get("playerId", None)
    name = websocket.query_params.get("name", None) or "Player"
    await websocket.accept()
    
    try:
        game = ensure_game(game_id)
        
        # Prevent duplicate WebSocket connections
        if game_id not in ROOMS:
            ROOMS[game_id] = []
        
        # Check if this WebSocket is already in the room
        if websocket not in ROOMS[game_id]:
            ROOMS[game_id].append(websocket)

        # Register player in database
        # Use a consistent player ID based on user ID and game
        import hashlib
        consistent_player_id = f"{player_id}_{game_id}_{hashlib.md5(f'{player_id}_{game_id}'.encode()).hexdigest()[:8]}"
        
        # Check if player already exists in this game
        existing_players = db_service.get_players(game_id)
        existing_player = next((p for p in existing_players if p.id == consistent_player_id), None)
        
        if existing_player:
            # Player already exists, just update connection status
            existing_player.connected = True
            db_service.db.commit()
            player = existing_player
        else:
            # Add new player
            player = db_service.add_player(game_id, consistent_player_id, name)
            if not player:
                await websocket.close()
                return
    except Exception as e:
        print(f"Error in WebSocket connection: {e}")
        await websocket.close()
        return

    # If two players present, go to bidding for round 1
    players = db_service.get_players(game_id)
    if game.phase == Phase.LOBBY and len(players) == 2:
        # Use the category that was set when the lobby was created
        category = game.category or "programming_languages"  # Fallback to programming_languages
        print(f"Starting game with category: {category}")
        category_items = await load_category(category)
        phase_ends_at = datetime.fromtimestamp(now() + settings.BIDDING_TIME_SECONDS)
        print(f"Setting phase_ends_at to: {phase_ends_at} (timestamp: {phase_ends_at.timestamp()})")
        db_service.update_game(game_id,
            phase=Phase.BIDDING,
            category=category,
            phase_ends_at=phase_ends_at
        )
        start_tick(game_id)

    players = db_service.get_players(game_id)
    scores = db_service.get_all_scores(game_id)
    await websocket.send_text(json.dumps({"type": "joined", "playerId": player_id, "game": game_snapshot(game, players, scores)}))
    await broadcast(game_id, {"type": "state_update", "game": game_snapshot(game, players, scores)})

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            typ = data.get("type")

            # place_bid { n }
            if typ == "place_bid" and game.phase == Phase.BIDDING:
                n = max(1, int(data.get("n", 1)))
                if n > game.high_bid:
                    db_service.update_game(game_id,
                        high_bid=n,
                        high_bidder_id=player_id,
                        phase_ends_at=datetime.fromtimestamp(min(
                            (game.phase_ends_at.timestamp() if game.phase_ends_at else now()+15),
                            now() + 5
                        ))
                    )
                    
                    # Refresh game state after update
                    game = db_service.get_game(game_id)
                    players = db_service.get_players(game_id)
                    scores = db_service.get_all_scores(game_id)
                    await broadcast(game_id, {"type": "bid_update", "highBid": n,
                                              "highBidderId": player_id, "game": game_snapshot(game, players, scores)})

            # pass {}
            elif typ == "pass" and game.phase == Phase.BIDDING:
                if game.high_bidder_id:
                    db_service.update_game(game_id,
                        phase=Phase.LISTING,
                        lister_id=game.high_bidder_id,
                        list_count=0,
                        phase_ends_at=datetime.fromtimestamp(now() + settings.LISTING_TIME_SECONDS)
                    )
                    db_service.clear_used_items(game_id)
                    
                    # Refresh game state after update
                    game = db_service.get_game(game_id)
                    players = db_service.get_players(game_id)
                    scores = db_service.get_all_scores(game_id)
                    await broadcast(game_id, {"type": "state_update", "game": game_snapshot(game, players, scores)})

            # submit_item { text }
            elif typ == "submit_item" and game.phase == Phase.LISTING and player_id == game.lister_id:
                text = normalize(data.get("text", ""))
                if not text:
                    continue
                
                used_items = db_service.get_used_items(game_id)
                if text in used_items:
                    await websocket.send_text(json.dumps({"type": "item_rejected", "reason": "duplicate", "text": text}))
                else:
                    # Load category items to validate
                    category_items = await load_category(game.category)
                    
                    if text not in category_items:
                        await websocket.send_text(json.dumps({"type": "item_rejected", "reason": "invalid", "text": text}))
                    else:
                        db_service.add_used_item(game_id, text)
                        new_count = game.list_count + 1
                        db_service.update_game(game_id, list_count=new_count)
                        
                        # Refresh game state after update
                        game = db_service.get_game(game_id)
                        players = db_service.get_players(game_id)
                        scores = db_service.get_all_scores(game_id)
                        await broadcast(game_id, {"type": "listing_update", "count": new_count, "lastItem": text,
                                                  "game": game_snapshot(game, players, scores)})
                        
                        # early win if reached bid
                        if new_count >= (game.high_bid or 1):
                            db_service.update_game(game_id, phase_ends_at=datetime.fromtimestamp(now()))
                            # Refresh game state after update
                            game = db_service.get_game(game_id)

            # start_match { bestOf }
            elif typ == "start_match" and game.phase == Phase.LOBBY:
                best_of = int(data.get("bestOf", settings.DEFAULT_BEST_OF))
                db_service.update_game(game_id, best_of=best_of)

    except WebSocketDisconnect:
        # Mark disconnect in database
        db_service.update_player_connection(player_id, False)
        players = db_service.get_players(game_id)
        scores = db_service.get_all_scores(game_id)
        await broadcast(game_id, {"type": "opponent_status", "connected": False, "game": game_snapshot(game, players, scores)})
    finally:
        # remove socket
        if websocket in ROOMS.get(game_id, []):
            ROOMS[game_id].remove(websocket)

# ----- HTTP endpoints

@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <h3>LiveCategories - PostgreSQL Edition</h3>
    <p>WebSocket at <code>/ws/{gameId}?name=YourName</code></p>
    <p>Available endpoints:</p>
    <ul>
        <li><code>GET /categories</code> - List available categories</li>
        <li><code>GET /categories/{name}</code> - Get items for a specific category</li>
        <li><code>GET /games/{game_id}/stats</code> - Get game statistics</li>
        <li><code>GET /players/{player_id}/history</code> - Get player history</li>
    </ul>
    """

@app.get("/categories")
async def get_categories():
    """Get list of available categories"""
    return {
        "categories": [
            {"name": "programming_languages", "display_name": "Programming Languages", "description": "Programming languages from GitHub API"},
            {"name": "countries", "display_name": "Countries", "description": "World countries from REST Countries API"},
            {"name": "animals", "display_name": "Animals", "description": "Animal names from API"},
            {"name": "fruits", "display_name": "Fruits", "description": "Fruit names from static file"}
        ]
    }

@app.get("/categories/{category_name}")
async def get_category_items(category_name: str):
    """Get items for a specific category"""
    try:
        items = await load_category(category_name)
        return {
            "category": category_name,
            "items": list(items),
            "count": len(items)
        }
    except Exception as e:
        return {"error": f"Failed to load category {category_name}: {str(e)}"}

@app.get("/games/{game_id}/stats")
def get_game_stats(game_id: str):
    """Get comprehensive game statistics"""
    return db_service.get_game_stats(game_id)

@app.get("/players/{player_id}/history")
def get_player_history(player_id: str):
    """Get player's game history"""
    return db_service.get_player_history(player_id)

@app.get("/lobby/{lobby_code}")
def get_game_by_lobby_code(lobby_code: str):
    """Get game by lobby code"""
    game = db_service.get_game_by_lobby_code(lobby_code)
    if not game:
        return {"error": "Game not found"}
    
    # Get players for this game
    players = db_service.get_players(game.id)
    
    return {
        "game_id": game.id,
        "lobby_code": game.lobby_code,
        "category": game.category,
        "phase": game.phase,
        "players": [{"id": p.id, "name": p.name, "connected": p.connected} for p in players],
        "best_of": game.best_of,
        "round_number": game.round_number
    }

@app.post("/lobby/create")
def create_lobby(category: str, best_of: int = 5):
    """Create a new lobby"""
    try:
        # Generate unique game ID
        import uuid
        game_id = f"game-{int(time.time() * 1000)}"
        
        # Create game with lobby code
        game = db_service.create_game(game_id, best_of)
        db_service.update_game(game_id, category=category)
        
        return {
            "game_id": game.id,
            "lobby_code": game.lobby_code,
            "category": category,
            "best_of": best_of,
            "phase": "lobby"
        }
    except Exception as e:
        return {"error": f"Failed to create lobby: {str(e)}"}

@app.post("/lobby/join-random")
def join_random_lobby(category: str):
    """Join a random available lobby or create new one"""
    try:
        # First, try to find an existing lobby with players
        existing_lobby = db_service.get_lobby_with_players(category)
        
        if existing_lobby:
            players = db_service.get_players(existing_lobby.id)
            return {
                "game_id": existing_lobby.id,
                "lobby_code": existing_lobby.lobby_code,
                "category": existing_lobby.category,
                "best_of": existing_lobby.best_of,
                "phase": "lobby",
                "players": [{"id": p.id, "name": p.name, "connected": p.connected} for p in players],
                "action": "joined_existing"
            }
        else:
            # Create new lobby
            import uuid
            game_id = f"game-{int(time.time() * 1000)}"
            game = db_service.create_game(game_id, 5)  # Default best_of
            db_service.update_game(game_id, category=category)
            
            return {
                "game_id": game.id,
                "lobby_code": game.lobby_code,
                "category": category,
                "best_of": 5,
                "phase": "lobby",
                "players": [],
                "action": "created_new"
            }
    except Exception as e:
        return {"error": f"Failed to join lobby: {str(e)}"}

@app.get("/lobby/available/{category}")
def get_available_lobbies(category: str):
    """Get available lobbies for a category"""
    try:
        lobbies = db_service.get_available_lobbies(category)
        result = []
        
        for lobby in lobbies:
            players = db_service.get_players(lobby.id)
            result.append({
                "game_id": lobby.id,
                "lobby_code": lobby.lobby_code,
                "category": lobby.category,
                "best_of": lobby.best_of,
                "player_count": len(players),
                "players": [{"id": p.id, "name": p.name, "connected": p.connected} for p in players]
            })
        
        return {"lobbies": result}
    except Exception as e:
        return {"error": f"Failed to get lobbies: {str(e)}"}

# ----- Startup and shutdown events

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("Starting LiveCategories with PostgreSQL...")
    create_tables()
    print("Database tables created/verified")
    print("API service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up services on shutdown"""
    await api_service.close()
    db_service.close()
    print("Services closed.")
