"""
Simplified FastAPI server for testing Firebase authentication without database dependency.
This allows us to test the Firebase auth flow independently of PostgreSQL setup.
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import sys

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

# Import Firebase modules
try:
    from firebase_admin import firebase_auth
    from firebase_auth import get_current_user
    FIREBASE_AVAILABLE = True
except ImportError as e:
    print(f"Firebase not available: {e}")
    FIREBASE_AVAILABLE = False

app = FastAPI(
    title="LiveCategories API (Firebase Test)",
    description="Simplified API for testing Firebase authentication",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "message": "LiveCategories API (Firebase Test Mode)",
        "status": "running",
        "firebase_available": FIREBASE_AVAILABLE
    }

@app.get("/auth/profile")
def get_profile(user_info: dict = Depends(get_current_user) if FIREBASE_AVAILABLE else None):
    """Get user profile - requires Firebase authentication."""
    if not FIREBASE_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Firebase authentication not configured"
        )
    
    return {
        "user": user_info,
        "message": "Profile retrieved successfully"
    }

@app.get("/auth/test")
def test_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Test endpoint that just checks for Bearer token presence."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    
    return {
        "message": "Token received",
        "token_preview": credentials.credentials[:20] + "..." if len(credentials.credentials) > 20 else credentials.credentials
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
