"""
FastAPI dependencies for Firebase authentication.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from .firebase_admin import get_firebase_auth, FirebaseAuth


# Security scheme for Bearer token
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    firebase_auth: FirebaseAuth = Depends(get_firebase_auth)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get the current authenticated user from Firebase ID token.
    
    Args:
        credentials: Bearer token from Authorization header
        firebase_auth: Firebase authentication service
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify the Firebase ID token
    user_info = firebase_auth.verify_id_token(credentials.credentials)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_info


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    firebase_auth: FirebaseAuth = Depends(get_firebase_auth)
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency to optionally get the current user.
    Returns None if no valid token is provided.
    
    Args:
        credentials: Optional Bearer token from Authorization header
        firebase_auth: Firebase authentication service
        
    Returns:
        Dict containing user information or None
    """
    if not credentials:
        return None
    
    try:
        user_info = firebase_auth.verify_id_token(credentials.credentials)
        return user_info
    except HTTPException:
        return None


# Backward compatibility - deprecated functions that should be removed
def verify_token(*args, **kwargs):
    """DEPRECATED: Use get_current_user dependency instead."""
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Legacy JWT verification is deprecated. Use Firebase authentication."
    )


def get_current_user_legacy(*args, **kwargs):
    """DEPRECATED: Use get_current_user dependency instead.""" 
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Legacy user authentication is deprecated. Use Firebase authentication."
    )
