from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Coastal Guard AI")

# Allow React (running on port 5173) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "Coastal Guard AI backend is running"}

@app.get("/api/alerts")
def get_alerts():
    # Dummy data for now; real AI results come later
    return [
        {"id": 1, "location": "Marina Drive Ernakulam", "risk": "High", "type": "Rough waves"},
        {"id": 2, "location": "Kozhikode ", "risk": "Medium", "type": "Oil spill suspected"},
        {'id': 3, "location": "Kollam", "risk": "Low", "type": "Minor debris"},
        {"id": 4, "location": "Trivandrum", "risk": "High", "type": "Strong currents"},
    ]