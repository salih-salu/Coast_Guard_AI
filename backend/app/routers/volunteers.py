from fastapi import APIRouter, HTTPException, Request

from ..database import fetch_all, fetch_one, pool
from ..schemas import VolunteerAvailability, VolunteerRegister

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])


def get_user(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")
    return user


def check_authority(user):
    if user.get("role") not in ("admin", "authority"):
        raise HTTPException(status_code=403, detail="Admin or authority access required")


@router.post("/register")
def register_volunteer(body: VolunteerRegister, request: Request):
    user = get_user(request)

    with pool.connection() as conn:
        volunteer = conn.execute(
            """INSERT INTO volunteer_profiles
               (user_id, phone, skills, latitude, longitude, is_available)
               VALUES (%s, %s, %s, %s, %s, TRUE)
               ON CONFLICT (user_id) DO UPDATE SET
                   phone = EXCLUDED.phone,
                   skills = EXCLUDED.skills,
                   latitude = EXCLUDED.latitude,
                   longitude = EXCLUDED.longitude
               RETURNING user_id, phone, skills, latitude, longitude, is_available""",
            (
                user["user_id"], body.phone, body.skills,
                body.latitude, body.longitude,
            ),
        ).fetchone()

        conn.execute(
            "UPDATE users SET role = 'volunteer' WHERE user_id = %s",
            (user["user_id"],),
        )

    return volunteer


@router.get("")
def list_volunteers(request: Request):
    user = get_user(request)
    check_authority(user)

    return fetch_all(
        """SELECT v.user_id, u.name, v.phone, v.skills,
                  v.latitude, v.longitude, v.is_available
           FROM volunteer_profiles v
           JOIN users u ON u.user_id = v.user_id
           ORDER BY u.name"""
    )


@router.get("/nearby/{incident_id}")
def get_nearby_volunteers(incident_id: int, request: Request):
    user = get_user(request)
    check_authority(user)

    incident = fetch_one(
        "SELECT incident_id, latitude, longitude FROM incidents WHERE incident_id = %s",
        (incident_id,),
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident["latitude"] is None or incident["longitude"] is None:
        raise HTTPException(status_code=400, detail="Incident has no GPS location")

    return fetch_all(
        """SELECT v.user_id, u.name, v.phone, v.skills,
                  v.latitude, v.longitude,
                  6371 * 2 * ASIN(SQRT(
                      POWER(SIN(RADIANS(v.latitude - %s) / 2), 2) +
                      COS(RADIANS(%s)) * COS(RADIANS(v.latitude)) *
                      POWER(SIN(RADIANS(v.longitude - %s) / 2), 2)
                  )) AS distance_km
           FROM volunteer_profiles v
           JOIN users u ON u.user_id = v.user_id
           WHERE v.is_available = TRUE
             AND v.latitude IS NOT NULL
             AND v.longitude IS NOT NULL
           ORDER BY distance_km""",
        (incident["latitude"], incident["latitude"], incident["longitude"]),
    )


@router.patch("/me/availability")
def change_availability(
    body: VolunteerAvailability,
    request: Request,
):
    user = get_user(request)

    with pool.connection() as conn:
        volunteer = conn.execute(
            """UPDATE volunteer_profiles
               SET is_available = %s
               WHERE user_id = %s
               RETURNING user_id, is_available""",
            (body.is_available, user["user_id"]),
        ).fetchone()

    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")

    return volunteer
