import httpx
from fastapi import APIRouter, HTTPException

from ..database import fetch_all, fetch_one
from ..services import weather_service

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("")
def current_weather(location_id: int):
    location = fetch_one(
        "SELECT location_id, name, district, latitude, longitude FROM locations WHERE location_id = %s",
        (location_id,),
    )
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    try:
        weather = weather_service.get_weather(location)
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Weather service is unavailable and no saved weather exists for this place yet",
        )

    return {
        "location": location["name"],
        "district": location["district"],
        "weather": weather,
        "attribution": "Weather data by Open-Meteo.com. Wave data from DWD via Open-Meteo.",
    }


@router.get("/history")
def weather_history(location_id: int):
    location = fetch_one(
        "SELECT location_id, name FROM locations WHERE location_id = %s",
        (location_id,),
    )
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    readings = fetch_all(
        """SELECT * FROM weather_readings
           WHERE location_id = %s
           ORDER BY recorded_at""",
        (location_id,),
    )

    return {"location": location["name"], "readings": readings}
