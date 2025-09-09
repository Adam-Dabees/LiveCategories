import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/livecategories")
    
    # API Configuration
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "10"))
    CACHE_TTL_MINUTES: int = int(os.getenv("CACHE_TTL_MINUTES", "5"))
    
    # Game Configuration
    DEFAULT_BEST_OF: int = int(os.getenv("DEFAULT_BEST_OF", "1"))  # Single round
    BIDDING_TIME_SECONDS: int = int(os.getenv("BIDDING_TIME_SECONDS", "30"))  # 30 seconds
    LISTING_TIME_SECONDS: int = int(os.getenv("LISTING_TIME_SECONDS", "120"))  # 2 minutes
    SUMMARY_TIME_SECONDS: int = int(os.getenv("SUMMARY_TIME_SECONDS", "10"))  # 10 seconds

settings = Settings()

