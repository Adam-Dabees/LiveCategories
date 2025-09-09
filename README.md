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

---

## 🛠 Tech Stack
- **Frontend**: Next.js 14, React
- **Backend**: FastAPI, Uvicorn
- **Realtime**: WebSockets
- **Future**: Redis (pub/sub, state storage), Docker + Kubernetes, CI/CD

---

## 🏃‍♂️ Running Locally

### 1. Clone the repo
```bash
git clone https://github.com/Adam-Dabees/LiveCategories.git
cd LiveCategories

2. Backend (FastAPI)

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

Backend will run at: http://localhost:8001

3. Frontend (Next.js)

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