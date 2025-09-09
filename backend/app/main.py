from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional
import json, time, asyncio

app = FastAPI(title="Realtime Categories (MVP)")

# ----- Game types

class Phase(str, Enum):
    LOBBY = "lobby"
    BIDDING = "bidding"
    LISTING = "listing"
    SUMMARY = "summary"
    ENDED = "ended"

@dataclass
class Player:
    id: str
    name: str
    connected: bool = True

@dataclass
class Game:
    id: str
    phase: Phase = Phase.LOBBY
    best_of: int = 5
    round: int = 1
    players: Dict[str, Player] = field(default_factory=dict)  # key: playerId
    scores: Dict[str, int] = field(default_factory=dict)
    category: Optional[str] = None
    category_items: Set[str] = field(default_factory=set)
    high_bid: int = 0
    high_bidder_id: Optional[str] = None
    lister_id: Optional[str] = None
    used_items: Set[str] = field(default_factory=set)
    list_count: int = 0
    phase_ends_at: Optional[float] = None  # epoch seconds
    # NOTE: server tick loop will check this timestamp to advance phases

# ----- In-memory stores (swap to Redis later)
GAMES: Dict[str, Game] = {}
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

def game_snapshot(g: Game) -> dict:
    return {
        "id": g.id,
        "phase": g.phase,
        "bestOf": g.best_of,
        "round": g.round,
        "players": {pid: {"id": p.id, "name": p.name, "connected": p.connected} for pid, p in g.players.items()},
        "scores": g.scores,
        "category": g.category,
        "highBid": g.high_bid,
        "highBidderId": g.high_bidder_id,
        "listerId": g.lister_id,
        "listCount": g.list_count,
        "phaseEndsAt": g.phase_ends_at,
    }

def ensure_game(game_id: str) -> Game:
    if game_id not in GAMES:
        GAMES[game_id] = Game(id=game_id)
        ROOMS[game_id] = []
    return GAMES[game_id]

def load_category(name: str) -> Set[str]:
    # MVP: only fruits. add more files later.
    if name == "fruits":
        import pathlib
        p = pathlib.Path(__file__).parent / "categories" / "fruits.json"
        return set(json.loads(p.read_text()))
    return set()

def start_tick(game_id: str):
    if game_id in TICK_TASKS:
        return
    TICK_TASKS[game_id] = asyncio.create_task(tick_loop(game_id))

async def tick_loop(game_id: str):
    """Server-authoritative phase timer."""
    while True:
        g = GAMES.get(game_id)
        if not g:
            break
        if g.phase in (Phase.ENDED,):
            break
        if g.phase_ends_at and now() >= g.phase_ends_at:
            # Advance phase
            if g.phase == Phase.BIDDING:
                # if no bids, seed lowest and pick random lister (first player)
                if not g.high_bidder_id and g.players:
                    g.high_bid = 1
                    g.high_bidder_id = next(iter(g.players.keys()))
                g.lister_id = g.high_bidder_id
                g.phase = Phase.LISTING
                g.list_count = 0
                g.used_items = set()
                g.phase_ends_at = now() + 30  # 30s listing
                await broadcast(game_id, {"type": "state_update", "game": game_snapshot(g)})
            elif g.phase == Phase.LISTING:
                # listing done -> scoring
                lister_hit = g.list_count >= g.high_bid
                lister = g.lister_id
                opponent = [pid for pid in g.players if pid != lister][0] if len(g.players) == 2 else None
                winner = lister if lister_hit else opponent
                if winner:
                    g.scores[winner] = g.scores.get(winner, 0) + 1
                g.phase = Phase.SUMMARY
                g.phase_ends_at = now() + 3
                await broadcast(game_id, {
                    "type": "round_result",
                    "winnerId": winner,
                    "listerHit": lister_hit,
                    "highBid": g.high_bid,
                    "game": game_snapshot(g)
                })
            elif g.phase == Phase.SUMMARY:
                # next round or end match
                target = (g.best_of // 2) + 1
                if any(score >= target for score in g.scores.values()):
                    g.phase = Phase.ENDED
                    g.phase_ends_at = None
                else:
                    g.round += 1
                    g.phase = Phase.BIDDING
                    g.high_bid = 0
                    g.high_bidder_id = None
                    g.lister_id = None
                    g.category = "fruits"  # MVP fixed category
                    g.category_items = load_category(g.category)
                    g.phase_ends_at = now() + 15  # 15s bidding
                await broadcast(game_id, {"type": "state_update", "game": game_snapshot(g)})
        await asyncio.sleep(0.2)

# ----- WebSocket endpoint

@app.websocket("/ws/{game_id}")
async def ws_endpoint(websocket: WebSocket, game_id: str):
    # query params: ?playerId=abc&name=Adam
    player_id = websocket.query_params.get("playerId", None)
    name = websocket.query_params.get("name", None) or "Player"
    await websocket.accept()
    g = ensure_game(game_id)
    ROOMS[game_id].append(websocket)

    # Register player
    if not player_id:
        # use socket id fallback (unsafe but ok for MVP)
        player_id = f"p{len(g.players)+1}"
    if player_id not in g.players:
        g.players[player_id] = Player(id=player_id, name=name)
        g.scores.setdefault(player_id, 0)
    else:
        g.players[player_id].connected = True

    # If two players present, go to bidding for round 1
    if g.phase == Phase.LOBBY and len(g.players) == 2:
        g.phase = Phase.BIDDING
        g.category = "fruits"
        g.category_items = load_category(g.category)
        g.phase_ends_at = now() + 15
        start_tick(game_id)

    await websocket.send_text(json.dumps({"type": "joined", "playerId": player_id, "game": game_snapshot(g)}))
    await broadcast(game_id, {"type": "state_update", "game": game_snapshot(g)})

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            typ = data.get("type")

            # place_bid { n }
            if typ == "place_bid" and g.phase == Phase.BIDDING:
                n = max(1, int(data.get("n", 1)))
                if n > g.high_bid:
                    g.high_bid = n
                    g.high_bidder_id = player_id
                    # shot clock: 5s from raise, capped by overall bidding end
                    g.phase_ends_at = min((g.phase_ends_at or now()+15), now() + 5)
                    await broadcast(game_id, {"type": "bid_update", "highBid": g.high_bid,
                                              "highBidderId": g.high_bidder_id, "game": game_snapshot(g)})

            # pass {}
            elif typ == "pass" and g.phase == Phase.BIDDING:
                # if both pass w/ existing high bid -> move to listing immediately
                # Simplified MVP: any pass when there is a high bid ends bidding
                if g.high_bidder_id:
                    g.lister_id = g.high_bidder_id
                    g.phase = Phase.LISTING
                    g.list_count = 0
                    g.used_items = set()
                    g.phase_ends_at = now() + 30
                    await broadcast(game_id, {"type": "state_update", "game": game_snapshot(g)})

            # submit_item { text }
            elif typ == "submit_item" and g.phase == Phase.LISTING and player_id == g.lister_id:
                text = normalize(data.get("text", ""))
                if not text:
                    continue
                if text in g.used_items:
                    await websocket.send_text(json.dumps({"type": "item_rejected", "reason": "duplicate", "text": text}))
                elif text not in g.category_items:
                    await websocket.send_text(json.dumps({"type": "item_rejected", "reason": "invalid", "text": text}))
                else:
                    g.used_items.add(text)
                    g.list_count += 1
                    await broadcast(game_id, {"type": "listing_update", "count": g.list_count, "lastItem": text,
                                              "game": game_snapshot(g)})
                    # early win if reached bid
                    if g.list_count >= (g.high_bid or 1):
                        g.phase_ends_at = now()  # trigger summary on next tick

            # start_match { bestOf }
            elif typ == "start_match" and g.phase == Phase.LOBBY:
                g.best_of = int(data.get("bestOf", 5))

    except WebSocketDisconnect:
        # Mark disconnect; keep game running
        g.players[player_id].connected = False
        await broadcast(game_id, {"type": "opponent_status", "connected": False, "game": game_snapshot(g)})
    finally:
        # remove socket
        if websocket in ROOMS.get(game_id, []):
            ROOMS[game_id].remove(websocket)

@app.get("/", response_class=HTMLResponse)
def root():
    return "<h3>Backend OK.</h3><p>WebSocket at <code>/ws/{gameId}?name=YourName</code></p>"