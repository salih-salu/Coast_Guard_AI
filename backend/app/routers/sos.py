from fastapi import APIRouter, status

from ..database import fetch_all, fetch_one, pool
from ..schemas import SOSRequest

router = APIRouter(prefix="/sos", tags=["SOS"])

NEAREST_LOCATION_SQL = """
    SELECT location_id, name, district,
           ROUND((6371 * 2 * ASIN(SQRT(
               POWER(SIN(RADIANS(latitude::float8 - %(lat)s::float8) / 2), 2) +
               COS(RADIANS(%(lat)s::float8)) * COS(RADIANS(latitude::float8)) *
               POWER(SIN(RADIANS(longitude::float8 - %(lng)s::float8) / 2), 2)
           )))::numeric, 1) AS distance_km
    FROM locations
    ORDER BY distance_km
    LIMIT 1
"""


@router.post("", status_code=status.HTTP_201_CREATED)
def raise_sos(body: SOSRequest):
    nearest = fetch_one(NEAREST_LOCATION_SQL, {"lat": body.latitude, "lng": body.longitude})

    with pool.connection() as conn:  # one transaction: both inserts succeed or neither does
        incident = conn.execute(
            """INSERT INTO incidents
                 (reported_by, location_id, incident_type, severity, title, description,
                  latitude, longitude, reporter_phone, status)
               VALUES (NULL, %s, 'sos_emergency', 'critical', %s, %s, %s, %s, %s, 'reported')
               RETURNING incident_id, status, reported_at""",
            (
                nearest["location_id"],
                f"SOS emergency near {nearest['name']}",
                body.message,
                body.latitude,
                body.longitude,
                body.phone,
            ),
        ).fetchone()
        conn.execute(
            """INSERT INTO incident_updates (incident_id, updated_by, status, note)
               VALUES (%s, NULL, 'reported', 'SOS received from the home page button.')""",
            (incident["incident_id"],),
        )

    numbers = fetch_all(
        "SELECT name, phone FROM emergency_contacts WHERE district IS NULL ORDER BY category"
    )
    return {
        "incident_id": incident["incident_id"],
        "status": incident["status"],
        "nearest_place": nearest["name"],
        "district": nearest["district"],
        "distance_to_place_km": nearest["distance_km"],
        "message": "SOS received. If your life is in danger, call 112 right now.",
        "emergency_numbers": numbers,
    }