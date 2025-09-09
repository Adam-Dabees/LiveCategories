from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from .config import settings

# Database configuration
DATABASE_URL = settings.DATABASE_URL

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Game(Base):
    __tablename__ = "games"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lobby_code = Column(String, unique=True, nullable=False, index=True)
    phase = Column(String, nullable=False, default="lobby")
    best_of = Column(Integer, nullable=False, default=5)
    round_number = Column(Integer, nullable=False, default=1)
    category = Column(String, nullable=True)
    high_bid = Column(Integer, nullable=False, default=0)
    high_bidder_id = Column(String, nullable=True)
    lister_id = Column(String, nullable=True)
    list_count = Column(Integer, nullable=False, default=0)
    phase_ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    players = relationship("Player", back_populates="game", cascade="all, delete-orphan")
    used_items = relationship("UsedItem", back_populates="game", cascade="all, delete-orphan")
    scores = relationship("GameScore", back_populates="game", cascade="all, delete-orphan")

class Player(Base):
    __tablename__ = "players"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    name = Column(String, nullable=False)
    connected = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game = relationship("Game", back_populates="players")
    scores = relationship("GameScore", back_populates="player", cascade="all, delete-orphan")

class GameScore(Base):
    __tablename__ = "game_scores"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    game = relationship("Game", back_populates="scores")
    player = relationship("Player", back_populates="scores")

class UsedItem(Base):
    __tablename__ = "used_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    item_text = Column(String, nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game = relationship("Game", back_populates="used_items")

class CategoryCache(Base):
    __tablename__ = "category_cache"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category_name = Column(String, nullable=False, unique=True)
    items = Column(JSON, nullable=False)
    cached_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

class GameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)
    session_data = Column(JSON, nullable=True)  # Store WebSocket session info
    connected_at = Column(DateTime, default=datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Drop tables (for testing)
def drop_tables():
    Base.metadata.drop_all(bind=engine)
