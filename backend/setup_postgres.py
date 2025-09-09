#!/usr/bin/env python3
"""
Setup script for PostgreSQL integration
"""
import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def main():
    print("🚀 Setting up LiveCategories with PostgreSQL...")
    
    # Install Python dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies")
        return False
    
    # Check if PostgreSQL is installed
    if not run_command("which psql", "Checking PostgreSQL installation"):
        print("❌ PostgreSQL not found. Please install PostgreSQL first:")
        print("   macOS: brew install postgresql")
        print("   Ubuntu: sudo apt-get install postgresql postgresql-contrib")
        print("   Windows: Download from https://www.postgresql.org/download/")
        return False
    
    # Check if PostgreSQL is running
    if not run_command("pg_isready", "Checking PostgreSQL service"):
        print("❌ PostgreSQL is not running. Please start it:")
        print("   macOS: brew services start postgresql")
        print("   Ubuntu: sudo systemctl start postgresql")
        print("   Windows: Start PostgreSQL service")
        return False
    
    # Create database
    print("🔄 Creating database...")
    create_db_commands = [
        "createdb livecategories 2>/dev/null || echo 'Database may already exist'",
        "psql -d livecategories -c 'SELECT 1;' > /dev/null 2>&1 || echo 'Database connection test'"
    ]
    
    for cmd in create_db_commands:
        run_command(cmd, "Database setup")
    
    print("✅ PostgreSQL setup completed!")
    print("\n📋 Next steps:")
    print("1. Update DATABASE_URL in config.py if needed")
    print("2. Run: python -c 'from app.database import create_tables; create_tables()'")
    print("3. Start server: uvicorn app.main_postgres:app --reload --port 8001")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

