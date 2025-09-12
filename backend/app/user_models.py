from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid = Column(String, unique=True, nullable=False, index=True)  # Firebase UID
    username = Column(String, unique=True, nullable=True, index=True)  # Optional for backward compatibility
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=True)  # Firebase display name
    photo_url = Column(String, nullable=True)  # Firebase photo URL
    email_verified = Column(Boolean, default=False)  # Firebase email verification status
    # Remove password_hash - Firebase handles authentication
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    firebase_created_at = Column(DateTime, nullable=True)  # Firebase creation time
    
    # Relationships
    game_participations = relationship("GameParticipation", back_populates="user", cascade="all, delete-orphan")
    statistics = relationship("UserStatistics", back_populates="user", cascade="all, delete-orphan")

class GameParticipation(Base):
    __tablename__ = "game_participations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    game_id = Column(String, nullable=False, index=True)
    player_id = Column(String, nullable=False)  # Player ID within the game
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    final_score = Column(Integer, default=0)
    won = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="game_participations")

class UserStatistics(Base):
    __tablename__ = "user_statistics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    total_games = Column(Integer, default=0)
    games_won = Column(Integer, default=0)
    total_score = Column(Integer, default=0)
    favorite_category = Column(String, nullable=True)
    longest_win_streak = Column(Integer, default=0)
    current_win_streak = Column(Integer, default=0)
    average_score_per_game = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="statistics")
