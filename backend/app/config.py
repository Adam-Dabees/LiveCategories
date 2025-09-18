import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/livecategories")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # API Configuration
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "10"))
    CACHE_TTL_MINUTES: int = int(os.getenv("CACHE_TTL_MINUTES", "5"))
    
    # Game Configuration
    DEFAULT_BEST_OF: int = int(os.getenv("DEFAULT_BEST_OF", "1"))  # Single round
    BIDDING_TIME_SECONDS: int = int(os.getenv("BIDDING_TIME_SECONDS", "30"))  # 30 seconds
    LISTING_TIME_SECONDS: int = int(os.getenv("LISTING_TIME_SECONDS", "120"))  # 2 minutes
    SUMMARY_TIME_SECONDS: int = int(os.getenv("SUMMARY_TIME_SECONDS", "10"))  # 10 seconds
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALLOWED_HOSTS: list = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    
    # Performance
    MAX_CONCURRENT_GAMES: int = int(os.getenv("MAX_CONCURRENT_GAMES", "1000"))
    WEBSOCKET_PING_INTERVAL: int = int(os.getenv("WEBSOCKET_PING_INTERVAL", "30"))
    WEBSOCKET_PING_TIMEOUT: int = int(os.getenv("WEBSOCKET_PING_TIMEOUT", "10"))
    
    # Monitoring
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"

settings = Settings()

