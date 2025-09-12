"""
Database migration to add Firebase UID support to existing users.
This script adds the firebase_uid column and other Firebase-related fields.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, get_db
from app.user_models import User


def run_migration():
    """Run the Firebase UID migration."""
    print("Starting Firebase UID migration...")
    
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()
        
        try:
            # Add firebase_uid column (nullable initially for existing users)
            print("Adding firebase_uid column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR UNIQUE;
            """))
            
            # Add display_name column
            print("Adding display_name column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS display_name VARCHAR;
            """))
            
            # Add photo_url column
            print("Adding photo_url column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS photo_url VARCHAR;
            """))
            
            # Add email_verified column
            print("Adding email_verified column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
            """))
            
            # Add firebase_created_at column
            print("Adding firebase_created_at column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS firebase_created_at TIMESTAMP;
            """))
            
            # Make username nullable (since Firebase users might not have usernames)
            print("Making username nullable...")
            conn.execute(text("""
                ALTER TABLE users 
                ALTER COLUMN username DROP NOT NULL;
            """))
            
            # Make password_hash nullable (since Firebase handles auth)
            print("Making password_hash nullable...")
            conn.execute(text("""
                ALTER TABLE users 
                ALTER COLUMN password_hash DROP NOT NULL;
            """))
            
            # Create index on firebase_uid
            print("Creating index on firebase_uid...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_firebase_uid 
                ON users (firebase_uid);
            """))
            
            # Commit the transaction
            trans.commit()
            print("✓ Migration completed successfully!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"✗ Migration failed: {e}")
            raise


def check_existing_users():
    """Check for existing users that need Firebase UID mapping."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, username, email, created_at 
            FROM users 
            WHERE firebase_uid IS NULL
            ORDER BY created_at;
        """))
        
        legacy_users = result.fetchall()
        
        if legacy_users:
            print(f"\nFound {len(legacy_users)} existing users without Firebase UID:")
            print("ID | Username | Email | Created")
            print("-" * 60)
            for user in legacy_users:
                print(f"{user.id[:8]}... | {user.username} | {user.email} | {user.created_at}")
            
            print("\nMigration Notes:")
            print("- These users will be automatically linked when they login with Firebase")
            print("- Email matching will be used to associate Firebase accounts")
            print("- Users should login with the same email they used before")
            print("- If emails don't match, new accounts will be created")
        else:
            print("\n✓ No legacy users found - all users have Firebase UIDs")


def main():
    """Run the complete migration process."""
    print("Firebase UID Migration Script")
    print("=" * 40)
    
    try:
        # Run the migration
        run_migration()
        
        # Check for existing users
        check_existing_users()
        
        print("\n" + "=" * 40)
        print("Migration Summary:")
        print("✓ Database schema updated for Firebase authentication")
        print("✓ Existing users will be migrated on first Firebase login")
        print("\nNext steps:")
        print("1. Deploy the new backend code")
        print("2. Configure Firebase service account credentials")
        print("3. Users can login with Firebase authentication")
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
