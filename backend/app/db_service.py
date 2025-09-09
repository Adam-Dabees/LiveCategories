from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Dict, List, Set, Optional
from datetime import datetime, timedelta
import json
from .database import Game, Player, GameScore, UsedItem, CategoryCache, GameSession, get_db

class DatabaseService:
    def __init__(self):
        self.db = next(get_db())
    
    def close(self):
        self.db.close()
    
    # Game operations
    def create_game(self, game_id: str, best_of: int = 5) -> Game:
        """Create a new game"""
        try:
            # Generate unique lobby code
            import random, string
            while True:
                lobby_code = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
                if not self.get_game_by_lobby_code(lobby_code):
                    break
            
            game = Game(
                id=game_id,
                lobby_code=lobby_code,
                best_of=best_of,
                phase="lobby",
                round_number=1
            )
            self.db.add(game)
            self.db.commit()
            self.db.refresh(game)
            return game
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_game(self, game_id: str) -> Optional[Game]:
        """Get game by ID"""
        try:
            return self.db.query(Game).filter(Game.id == game_id).first()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_game_by_lobby_code(self, lobby_code: str) -> Optional[Game]:
        """Get game by lobby code"""
        try:
            return self.db.query(Game).filter(Game.lobby_code == lobby_code).first()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def update_game(self, game_id: str, **kwargs) -> Optional[Game]:
        """Update game properties"""
        game = self.get_game(game_id)
        if game:
            for key, value in kwargs.items():
                setattr(game, key, value)
            game.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(game)
        return game
    
    def delete_game(self, game_id: str) -> bool:
        """Delete a game and all related data"""
        game = self.get_game(game_id)
        if game:
            self.db.delete(game)
            self.db.commit()
            return True
        return False
    
    # Player operations
    def add_player(self, game_id: str, player_id: str, name: str) -> Optional[Player]:
        """Add player to game"""
        try:
            game = self.get_game(game_id)
            if not game:
                return None
            
            # Check if player already exists
            existing_player = self.db.query(Player).filter(
                and_(Player.game_id == game_id, Player.id == player_id)
            ).first()
            
            if existing_player:
                existing_player.connected = True
                existing_player.name = name
                self.db.commit()
                return existing_player
            
            player = Player(
                id=player_id,
                game_id=game_id,
                name=name,
                connected=True
            )
            self.db.add(player)
            self.db.commit()
            self.db.refresh(player)
            return player
        except Exception as e:
            self.db.rollback()
            print(f"Error adding player: {e}")
            # If it's a duplicate key error, try to get the existing player
            try:
                existing_player = self.db.query(Player).filter(
                    and_(Player.game_id == game_id, Player.id == player_id)
                ).first()
                if existing_player:
                    existing_player.connected = True
                    existing_player.name = name
                    self.db.commit()
                    return existing_player
            except:
                pass
            return None
    
    def get_players(self, game_id: str) -> List[Player]:
        """Get all players in a game"""
        try:
            return self.db.query(Player).filter(Player.game_id == game_id).all()
        except Exception as e:
            self.db.rollback()
            print(f"Error getting players: {e}")
            return []
    
    def update_player_connection(self, player_id: str, connected: bool):
        """Update player connection status"""
        player = self.db.query(Player).filter(Player.id == player_id).first()
        if player:
            player.connected = connected
            self.db.commit()
    
    # Score operations
    def get_player_score(self, game_id: str, player_id: str) -> int:
        """Get player's current score in a game"""
        score = self.db.query(GameScore).filter(
            and_(GameScore.game_id == game_id, GameScore.player_id == player_id)
        ).first()
        return score.score if score else 0
    
    def update_player_score(self, game_id: str, player_id: str, score: int):
        """Update player's score in a game"""
        existing_score = self.db.query(GameScore).filter(
            and_(GameScore.game_id == game_id, GameScore.player_id == player_id)
        ).first()
        
        if existing_score:
            existing_score.score = score
            existing_score.updated_at = datetime.utcnow()
        else:
            new_score = GameScore(
                game_id=game_id,
                player_id=player_id,
                score=score
            )
            self.db.add(new_score)
        
        self.db.commit()
    
    def get_all_scores(self, game_id: str) -> Dict[str, int]:
        """Get all player scores for a game"""
        scores = self.db.query(GameScore).filter(GameScore.game_id == game_id).all()
        return {score.player_id: score.score for score in scores}
    
    # Used items operations
    def add_used_item(self, game_id: str, item_text: str):
        """Add an item to the used items list"""
        used_item = UsedItem(
            game_id=game_id,
            item_text=item_text
        )
        self.db.add(used_item)
        self.db.commit()
    
    def get_used_items(self, game_id: str) -> Set[str]:
        """Get all used items for a game"""
        items = self.db.query(UsedItem).filter(UsedItem.game_id == game_id).all()
        return {item.item_text for item in items}
    
    def clear_used_items(self, game_id: str):
        """Clear all used items for a game (new round)"""
        self.db.query(UsedItem).filter(UsedItem.game_id == game_id).delete()
        self.db.commit()
    
    # Category cache operations
    def cache_category_items(self, category_name: str, items: Set[str], ttl_minutes: int = 5):
        """Cache category items with TTL"""
        expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
        
        # Remove existing cache
        self.db.query(CategoryCache).filter(
            CategoryCache.category_name == category_name
        ).delete()
        
        # Add new cache
        cache = CategoryCache(
            category_name=category_name,
            items=list(items),
            expires_at=expires_at
        )
        self.db.add(cache)
        self.db.commit()
    
    def get_cached_category_items(self, category_name: str) -> Optional[Set[str]]:
        """Get cached category items if not expired"""
        cache = self.db.query(CategoryCache).filter(
            and_(
                CategoryCache.category_name == category_name,
                CategoryCache.expires_at > datetime.utcnow()
            )
        ).first()
        
        if cache:
            return set(cache.items)
        return None
    
    # Game session operations
    def create_game_session(self, game_id: str, player_id: str, session_data: Dict = None):
        """Create a new game session"""
        session = GameSession(
            game_id=game_id,
            player_id=player_id,
            session_data=session_data or {}
        )
        self.db.add(session)
        self.db.commit()
        return session
    
    def end_game_session(self, game_id: str, player_id: str):
        """End a game session"""
        session = self.db.query(GameSession).filter(
            and_(
                GameSession.game_id == game_id,
                GameSession.player_id == player_id,
                GameSession.is_active == True
            )
        ).first()
        
        if session:
            session.is_active = False
            session.disconnected_at = datetime.utcnow()
            self.db.commit()
    
    def get_active_sessions(self, game_id: str) -> List[GameSession]:
        """Get all active sessions for a game"""
        return self.db.query(GameSession).filter(
            and_(
                GameSession.game_id == game_id,
                GameSession.is_active == True
            )
        ).all()
    
    # Analytics operations
    def get_game_stats(self, game_id: str) -> Dict:
        """Get comprehensive game statistics"""
        game = self.get_game(game_id)
        if not game:
            return {}
        
        players = self.get_players(game_id)
        scores = self.get_all_scores(game_id)
        used_items = self.get_used_items(game_id)
        active_sessions = self.get_active_sessions(game_id)
        
        return {
            "game_id": game_id,
            "phase": game.phase,
            "round": game.round_number,
            "best_of": game.best_of,
            "category": game.category,
            "high_bid": game.high_bid,
            "list_count": game.list_count,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "connected": p.connected,
                    "score": scores.get(p.id, 0)
                }
                for p in players
            ],
            "used_items_count": len(used_items),
            "active_connections": len(active_sessions),
            "created_at": game.created_at.isoformat(),
            "updated_at": game.updated_at.isoformat()
        }
    
    def get_player_history(self, player_id: str) -> List[Dict]:
        """Get player's game history"""
        games = self.db.query(Game).join(Player).filter(Player.id == player_id).all()
        history = []
        
        for game in games:
            score = self.get_player_score(game.id, player_id)
            history.append({
                "game_id": game.id,
                "phase": game.phase,
                "score": score,
                "created_at": game.created_at.isoformat()
            })
        
        return history
    
    # Lobby management operations
    def get_available_lobbies(self, category: str = None) -> List[Game]:
        """Get lobbies that are waiting for players"""
        query = self.db.query(Game).filter(
            and_(
                Game.phase == "lobby",
                Game.phase_ends_at.is_(None)  # Not in progress
            )
        )
        
        if category:
            query = query.filter(Game.category == category)
        
        return query.all()
    
    def get_lobby_with_players(self, category: str = None) -> Optional[Game]:
        """Get a lobby that already has at least one player"""
        lobbies = self.get_available_lobbies(category)
        
        for lobby in lobbies:
            players = self.get_players(lobby.id)
            if len(players) > 0 and len(players) < 2:  # Has players but not full
                return lobby
        
        return None
    
    def get_game_players(self, game_id: str) -> List[Player]:
        """Alias for get_players for compatibility"""
        return self.get_players(game_id)

# Global instance
db_service = DatabaseService()
