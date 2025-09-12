"""
Firebase Admin SDK setup for server-side authentication verification.
"""
import os
import json
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status


class FirebaseAuth:
    """Firebase Admin SDK wrapper for authentication verification."""
    
    def __init__(self):
        self._app = None
        self._initialized = False
        self._initialize()
    
    def _initialize(self):
        """Initialize Firebase Admin SDK."""
        try:
            # Check if already initialized
            if firebase_admin._apps:
                self._app = firebase_admin.get_app()
                self._initialized = True
                print("Firebase Admin SDK already initialized")
                return
            
            # Try to get service account from environment variable
            service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            
            if service_account_json:
                # Parse JSON from environment variable
                try:
                    service_account_info = json.loads(service_account_json)
                    cred = credentials.Certificate(service_account_info)
                    print("Using Firebase service account from environment variable")
                except json.JSONDecodeError as e:
                    print(f"Error parsing Firebase service account JSON: {e}")
                    return
                    
            elif service_account_path and os.path.exists(service_account_path):
                # Use service account file path
                cred = credentials.Certificate(service_account_path)
                print(f"Using Firebase service account from file: {service_account_path}")
                
            else:
                # Try to use default application credentials (for Google Cloud deployment)
                try:
                    cred = credentials.ApplicationDefault()
                    print("Using Firebase default application credentials")
                except Exception as e:
                    print(f"Firebase Admin SDK not configured: {e}")
                    print("Please set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH environment variable")
                    return
            
            # Initialize the app
            self._app = firebase_admin.initialize_app(cred)
            self._initialized = True
            print("Firebase Admin SDK initialized successfully")
            
        except Exception as e:
            print(f"Failed to initialize Firebase Admin SDK: {e}")
            self._initialized = False
    
    def verify_id_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify a Firebase ID token and return the decoded claims.
        
        Args:
            id_token: The Firebase ID token to verify
            
        Returns:
            Dict containing user information if token is valid, None otherwise
        """
        if not self._initialized:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Firebase Admin SDK not configured"
            )
        
        try:
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            
            return {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture'),
                'firebase_claims': decoded_token
            }
            
        except auth.InvalidIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid ID token"
            )
        except auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Expired ID token"
            )
        except Exception as e:
            print(f"Error verifying ID token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed"
            )
    
    def get_user_by_uid(self, uid: str) -> Optional[Dict[str, Any]]:
        """
        Get user information by Firebase UID.
        
        Args:
            uid: Firebase user UID
            
        Returns:
            Dict containing user information if found, None otherwise
        """
        if not self._initialized:
            return None
            
        try:
            user_record = auth.get_user(uid)
            return {
                'uid': user_record.uid,
                'email': user_record.email,
                'email_verified': user_record.email_verified,
                'display_name': user_record.display_name,
                'photo_url': user_record.photo_url,
                'disabled': user_record.disabled,
                'creation_time': user_record.user_metadata.creation_timestamp,
                'last_sign_in_time': user_record.user_metadata.last_sign_in_timestamp
            }
        except auth.UserNotFoundError:
            return None
        except Exception as e:
            print(f"Error getting user by UID: {e}")
            return None


# Global instance
firebase_auth = FirebaseAuth()


def get_firebase_auth() -> FirebaseAuth:
    """Dependency injection for Firebase authentication."""
    return firebase_auth
