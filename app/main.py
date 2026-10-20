from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from fastapi import FastAPI, HTTPException

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
    
# @app.get("/api/weather")
# def get_weather():
#     # Dummy data for now; replace with a real marine API later
#     return {
#         "location": "Kochi",
#         "temp": 28,
#         "condition": "Partly Cloudy",
#         "wave_height": 1.8,
#         "wind_speed": 24,
#         "humidity": 72,
#         "visibility": 8,
#     }


KERALA_PLACES = {
    "Kochi":              {"lat": 9.9312,  "lon": 76.2673, "sea_lat": 9.95,  "sea_lon": 76.10},
    "Thiruvananthapuram": {"lat": 8.5241,  "lon": 76.9366, "sea_lat": 8.45,  "sea_lon": 76.85},
    "Kozhikode":          {"lat": 11.2588, "lon": 75.7804, "sea_lat": 11.26, "sea_lon": 75.65},
    "Alappuzha":          {"lat": 9.4981,  "lon": 76.3388, "sea_lat": 9.50,  "sea_lon": 76.20},
    "Kollam":             {"lat": 8.8932,  "lon": 76.6141, "sea_lat": 8.88,  "sea_lon": 76.50},
    "Kannur":             {"lat": 11.8745, "lon": 75.3704, "sea_lat": 11.88, "sea_lon": 75.25},
}

WEATHER_CODES = {
    0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    80: "Rain showers", 81: "Rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}

@app.get("/api/weather")
def get_weather(city: str = "Kochi"):
    place = KERALA_PLACES.get(city)
    if not place:
        raise HTTPException(status_code=404, detail="City not supported")

    try:
        weather = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": place["lat"],
                "longitude": place["lon"],
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility",
                "timezone": "Asia/Kolkata",
            },
            timeout=10,
        ).json()["current"]

        marine = httpx.get(
            "https://marine-api.open-meteo.com/v1/marine",
            params={
                "latitude": place["sea_lat"],
                "longitude": place["sea_lon"],
                "current": "wave_height",
                "timezone": "Asia/Kolkata",
            },
            timeout=10,
        ).json()
        wave = marine.get("current", {}).get("wave_height")
    except Exception:
        raise HTTPException(status_code=502, detail="Weather service unavailable")

    return {
        "location": f"{city}, Kerala",
        "temp": round(weather["temperature_2m"]),
        "condition": WEATHER_CODES.get(weather["weather_code"], "Unknown"),
        "wave_height": wave if wave is not None else 0,
        "wind_speed": round(weather["wind_speed_10m"]),
        "humidity": weather["relative_humidity_2m"],
        "visibility": round((weather.get("visibility") or 0) / 1000, 1),
    }