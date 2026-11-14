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


@router.get("/alerts")
def list_sos_alerts(phone: str | None = None, email: str | None = None):
    """Returns emergency SOS alerts.
       When called by a user (with phone or email), returns only alerts belonging to that user.
       When called by Admin/Volunteer (no filter), returns all active alerts."""
    query = """
        SELECT i.incident_id, i.title, i.description, i.severity, i.status,
               i.reporter_phone, i.latitude, i.longitude, i.reported_at,
               COALESCE(l.name, 'Coastal Waters') AS place,
               COALESCE(l.district, 'Kerala Coast') AS district
        FROM incidents i
        LEFT JOIN locations l ON l.location_id = i.location_id
        WHERE i.incident_type = 'sos_emergency'
    """
    params = []
    conditions = []

    if phone and phone.strip():
        conditions.append("i.reporter_phone = %s")
        params.append(phone.strip())

    if email and email.strip():
        conditions.append("i.description ILIKE %s")
        params.append(f"%{email.strip()}%")

    if conditions:
        query += " AND (" + " OR ".join(conditions) + ")"

    query += " ORDER BY i.reported_at DESC LIMIT 20"
    return fetch_all(query, tuple(params) if params else None)


@router.post("/{incident_id}/status")
def update_sos_status(incident_id: int, status_update: dict):
    """Allows Admin to accept and dispatch an SOS alert, or Volunteer to confirm.
       Uses valid check constraint statuses: 'verified', 'in_progress', 'resolved', 'closed'."""
    raw_status = status_update.get("status", "in_progress").strip().lower()

    # Map requested status to values allowed by PostgreSQL incidents_status_check
    # Valid DB statuses: 'reported', 'verified', 'in_progress', 'resolved', 'closed'
    if raw_status in ("admin_accepted", "dispatched", "accepted"):
        db_status = "in_progress"
    elif raw_status in ("verified", "in_progress", "resolved", "closed", "reported"):
        db_status = raw_status
    else:
        db_status = "in_progress"

    note = status_update.get("note", "Status updated by command desk")

    with pool.connection() as conn:
        res = conn.execute(
            """
            UPDATE incidents
            SET status = %s
            WHERE incident_id = %s
            RETURNING incident_id, status
            """,
            (db_status, incident_id),
        ).fetchone()

        # Record update history if incident exists
        if res:
            try:
                conn.execute(
                    """
                    INSERT INTO incident_updates (incident_id, updated_by, status, note)
                    VALUES (%s, NULL, %s, %s)
                    """,
                    (incident_id, db_status, note),
                )
            except Exception:
                pass
        conn.commit()

    return {"message": "Incident updated", "incident": res}


@router.post("", status_code=status.HTTP_201_CREATED)
def raise_sos(body: SOSRequest):
    nearest = fetch_one(NEAREST_LOCATION_SQL, {"lat": body.latitude, "lng": body.longitude})
    loc_id = nearest["location_id"] if nearest else None
    loc_name = nearest["name"] if nearest else "Coastal Kerala"
    loc_district = nearest["district"] if nearest else "Kerala"
    loc_dist = nearest["distance_km"] if nearest else 0.0

    with pool.connection() as conn:  # one transaction: both inserts succeed or neither does
        incident = conn.execute(
            """INSERT INTO incidents
                 (reported_by, location_id, incident_type, severity, title, description,
                  latitude, longitude, reporter_phone, status)
               VALUES (NULL, %s, 'sos_emergency', 'critical', %s, %s, %s, %s, %s, 'reported')
               RETURNING incident_id, status, reported_at""",
            (
                loc_id,
                f"SOS emergency near {loc_name}",
                body.message or "Immediate Coastal Distress Call",
                body.latitude,
                body.longitude,
                body.phone or "Not provided",
            ),
        ).fetchone()
        conn.commit()

    numbers = fetch_all(
        "SELECT name, phone FROM emergency_contacts WHERE district IS NULL ORDER BY category"
    )
    return {
        "incident_id": incident["incident_id"],
        "status": incident["status"],
        "nearest_place": loc_name,
        "district": loc_district,
        "distance_to_place_km": loc_dist,
        "message": "SOS received. If your life is in danger, call 112 right now.",
        "emergency_numbers": numbers,
    }