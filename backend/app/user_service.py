"""
User service for managing Firebase authenticated users in the database.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from .user_models import User, UserStatistics
from .database import get_db


class UserService:
    """Service for managing users with Firebase authentication."""
    
    @staticmethod
    def get_user_by_firebase_uid(db: Session, firebase_uid: str) -> Optional[User]:
        """Get user by Firebase UID."""
        return db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def create_user_from_firebase(
        db: Session, 
        firebase_uid: str, 
        email: str, 
        display_name: Optional[str] = None,
        photo_url: Optional[str] = None,
        email_verified: bool = False,
        firebase_created_at: Optional[datetime] = None
    ) -> User:
        """
        Create a new user from Firebase authentication data.
        
        Args:
            db: Database session
            firebase_uid: Firebase user UID
            email: User email
            display_name: Firebase display name
            photo_url: Firebase photo URL
            email_verified: Email verification status
            firebase_created_at: Firebase account creation time
            
        Returns:
            Created User object
        """
        # Generate a username from email if display_name not provided
        username = display_name or email.split('@')[0]
        
        # Ensure username is unique
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            username=username,
            display_name=display_name,
            photo_url=photo_url,
            email_verified=email_verified,
            firebase_created_at=firebase_created_at,
            last_login=datetime.utcnow()
        )
        
        db.add(user)
        
        # Create initial user statistics
        stats = UserStatistics(
            user_id=user.id,
            games_played=0,
            games_won=0,
            total_points=0,
            average_score=0.0
        )
        db.add(stats)
        
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def update_user_login(db: Session, user: User) -> User:
        """Update user's last login time."""
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def update_user_from_firebase(
        db: Session,
        user: User,
        display_name: Optional[str] = None,
        photo_url: Optional[str] = None,
        email_verified: Optional[bool] = None
    ) -> User:
        """Update user information from Firebase data."""
        if display_name is not None:
            user.display_name = display_name
        if photo_url is not None:
            user.photo_url = photo_url
        if email_verified is not None:
            user.email_verified = email_verified
            
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_or_create_user(
        db: Session,
        firebase_user_info: Dict[str, Any]
    ) -> User:
        """
        Get existing user or create new one from Firebase user info.
        
        Args:
            db: Database session
            firebase_user_info: User info from Firebase ID token verification
            
        Returns:
            User object (existing or newly created)
        """
        firebase_uid = firebase_user_info['uid']
        email = firebase_user_info.get('email')
        
        # Try to find existing user by Firebase UID
        user = UserService.get_user_by_firebase_uid(db, firebase_uid)
        
        if user:
            # Update login time and any changed Firebase data
            UserService.update_user_login(db, user)
            UserService.update_user_from_firebase(
                db, user,
                display_name=firebase_user_info.get('name'),
                photo_url=firebase_user_info.get('picture'),
                email_verified=firebase_user_info.get('email_verified')
            )
            return user
        
        # Check if there's a legacy user with this email that needs migration
        if email:
            legacy_user = UserService.get_user_by_email(db, email)
            if legacy_user and not legacy_user.firebase_uid:
                # Migrate legacy user to Firebase
                legacy_user.firebase_uid = firebase_uid
                legacy_user.display_name = firebase_user_info.get('name')
                legacy_user.photo_url = firebase_user_info.get('picture')
                legacy_user.email_verified = firebase_user_info.get('email_verified', False)
                UserService.update_user_login(db, legacy_user)
                print(f"Migrated legacy user {email} to Firebase UID {firebase_uid}")
                return legacy_user
        
        # Create new user
        if not email:
            raise ValueError("Email is required to create a new user")
            
        firebase_claims = firebase_user_info.get('firebase_claims', {})
        firebase_created_at = None
        if 'auth_time' in firebase_claims:
            firebase_created_at = datetime.fromtimestamp(firebase_claims['auth_time'])
        
        return UserService.create_user_from_firebase(
            db=db,
            firebase_uid=firebase_uid,
            email=email,
            display_name=firebase_user_info.get('name'),
            photo_url=firebase_user_info.get('picture'),
            email_verified=firebase_user_info.get('email_verified', False),
            firebase_created_at=firebase_created_at
        )


# Dependency injection
def get_user_service() -> UserService:
    """Get UserService instance for dependency injection."""
    return UserService()
