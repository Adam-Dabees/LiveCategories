# Firebase Firestore Setup for LiveCategories

## Issue: Connection Failed - Permission Denied

The "Connection Failed" error you're seeing is because Firestore security rules are blocking read/write access. Here's how to fix it:

## 🔧 Fix the Firebase Firestore Rules

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `livecate-508ad`

### Step 2: Configure Firestore Security Rules
1. In the left sidebar, go to **Firestore Database**
2. Click on the **Rules** tab
3. Replace the existing rules with these **temporary development rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to lobbies for authenticated users
    match /lobbies/{lobbyId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow read/write access to lobby actions for authenticated users
    match /lobbies/{lobbyId}/actions/{actionId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

### Step 3: Verify Authentication is Working
Make sure Firebase Authentication is properly set up:
1. Go to **Authentication** > **Sign-in method**
2. Ensure **Email/Password** is enabled
3. Check that users can sign in successfully

## 🚀 Production-Ready Rules (Use Later)

For production, use more restrictive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lobbies: Users can create, read, and update lobbies they're part of
    match /lobbies/{lobbyId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && 
        (request.auth.uid in resource.data.players || 
         request.auth.uid in request.resource.data.players);
    }
    
    // Actions: Only participants can read/write actions
    match /lobbies/{lobbyId}/actions/{actionId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/lobbies/$(lobbyId)) &&
        request.auth.uid in get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.players;
    }
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🛠️ Alternative: Fallback Mode

The code has been updated to automatically fallback to local storage if Firestore fails. This means:

- ✅ **If Firestore works**: Real-time multiplayer with Firebase
- ✅ **If Firestore fails**: Local storage mode (single-browser session)

## 📝 Current Status

- **Firestore**: Configured to use Firestore for real-time features
- **Fallback**: Local storage when Firebase is unavailable
- **Error Handling**: Better error messages and graceful degradation
- **Logging**: Console logs to help debug connection issues

## 🔍 Testing

1. **Set up the Firestore rules** as shown above
2. **Sign in** to your app with a valid user account
3. **Try creating a lobby** - it should work with real-time features
4. **Check browser console** for any remaining errors

## ❗ Quick Fix

If you just want to test immediately, use these **open rules** (ONLY for testing):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    allow read, write: if true;
  }
}
```

**⚠️ WARNING**: These rules allow anyone to read/write your database. Only use for testing!