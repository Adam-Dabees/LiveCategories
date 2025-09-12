# LiveCategories 🎮

A real-time multiplayer game where two players compete to name items in a category under time pressure.  
Built with **Next.js (frontend)** and **FastAPI (backend)** using **WebSockets** for live interaction.

---

## 🚀 Features
- Two-player, best-of-5 match format  
- Categories revealed each round (e.g., fruits, animals, countries)
- Bidding system: players bid how many items they can list
- Timed listing phase (30s) with live validation
- Server-authoritative state machine (lobby → bidding → listing → summary → end)
- Real-time UI updates with WebSockets
- **Firebase Authentication** with Google Sign-In support
- User profiles and game history tracking

---

## 🛠 Tech Stack
- **Frontend**: Next.js 14, React, Firebase Web SDK
- **Backend**: FastAPI, Firebase Admin SDK, PostgreSQL
- **Authentication**: Firebase Authentication (email/password + Google Sign-In)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Realtime**: WebSockets
- **Future**: Redis (pub/sub, state storage), Docker + Kubernetes, CI/CD

---

## 🔥 Firebase Setup

This project uses Firebase Authentication for secure user management. Follow these steps to configure Firebase:

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Authentication → Sign-in methods:
   - Email/Password ✅
   - Google ✅

### 2. Get Firebase Config
1. Project Settings → General → Your apps
2. Add web app, copy config object
3. Create `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Get Service Account (Backend)
1. Project Settings → Service accounts
2. Generate new private key (downloads JSON file)
3. Create `backend/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
# OR use individual fields:
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
```

### 4. Database Setup
```powershell
cd backend
python migrations/add_firebase_support.py
```

---

## 🏃‍♂️ Running Locally

### 1. Clone & Setup
```bash
git clone https://github.com/Adam-Dabees/LiveCategories.git
cd LiveCategories
```

### 2. Backend (FastAPI)
```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run database migration
python migrations/add_firebase_support.py

# Start server
uvicorn app.main:app --reload --port 8001
```

Backend will run at: http://localhost:8001

### 3. Frontend (Next.js)
```powershell
cd ../frontend
npm install
npm run dev

Frontend will run at: http://localhost:3000

4. Test it
	•	Open two browser tabs
	•	Enter different names but the same Game ID
	•	Play a round!

⸻

📌 Roadmap
	•	More categories
	•	Public matchmaking
	•	Spectator mode
	•	Redis integration
	•	Docker + Kubernetes deployment

⸻

📄 License

MIT License. Free to use and adapt.

---

Do you want me to also make a **shorter professional-style README** (just setup + tech stack), or keep this fun/gamey vibe?