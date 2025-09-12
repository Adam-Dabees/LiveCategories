"""
Simple test script to verify Firebase Admin SDK integration.
Run this script to test Firebase authentication verification.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.firebase_admin import firebase_auth


def test_firebase_initialization():
    """Test Firebase Admin SDK initialization."""
    print("Testing Firebase Admin SDK initialization...")
    
    if firebase_auth._initialized:
        print("✓ Firebase Admin SDK is initialized")
        return True
    else:
        print("✗ Firebase Admin SDK is not initialized")
        print("Make sure to set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH")
        return False


def test_token_verification():
    """Test token verification with a sample (invalid) token."""
    print("\nTesting token verification...")
    
    if not firebase_auth._initialized:
        print("✗ Skipping token test - Firebase not initialized")
        return False
    
    # Test with an obviously invalid token
    try:
        result = firebase_auth.verify_id_token("invalid_token")
        print("✗ Should have failed with invalid token")
        return False
    except Exception as e:
        print(f"✓ Correctly rejected invalid token: {e}")
        return True


def main():
    """Run Firebase tests."""
    print("Firebase Admin SDK Test")
    print("=" * 40)
    
    # Test initialization
    init_success = test_firebase_initialization()
    
    # Test token verification
    token_success = test_token_verification()
    
    print("\n" + "=" * 40)
    if init_success:
        print("✓ Firebase Admin SDK is ready for use")
        print("\nTo test with a real token:")
        print("1. Login to your frontend at http://localhost:3000/login")
        print("2. Open browser dev tools and run:")
        print("   firebase.auth().currentUser.getIdToken().then(console.log)")
        print("3. Use that token to test the /user/profile endpoint")
    else:
        print("✗ Firebase Admin SDK setup incomplete")
        print("\nSetup instructions:")
        print("1. Create a Firebase service account key:")
        print("   - Go to Firebase Console > Project Settings > Service Accounts")
        print("   - Click 'Generate new private key'")
        print("   - Save the JSON file securely")
        print("2. Set environment variable:")
        print("   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/service-account.json")
        print("   OR")
        print('   FIREBASE_SERVICE_ACCOUNT_JSON=\'{"type":"service_account",...}\'')


if __name__ == "__main__":
    main()
