from fastapi import APIRouter, HTTPException, Query, Request, status

from ..database import fetch_all, fetch_one, pool
from ..schemas import IncidentCreate, IncidentStatusUpdate

router = APIRouter(prefix="/incidents", tags=["Incidents"])


def get_user(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    return user


def check_authority(user):
    if user.get("role") not in ("admin", "authority"):
        raise HTTPException(status_code=403, detail="Admin or authority access required")


@router.get("")
def list_incidents(
    request: Request,
    incident_status: str | None = Query(default=None, alias="status"),
    severity: str | None = None,
    incident_type: str | None = Query(default=None, alias="type"),
    district: str | None = None,
    open_only: bool = False,
):
    user = get_user(request)
    check_authority(user)

    query = """SELECT i.incident_id, l.name AS place, l.district,
                      i.incident_type, i.severity, i.description,
                      i.latitude, i.longitude, i.status, i.reported_at
               FROM incidents i
               LEFT JOIN locations l ON l.location_id = i.location_id"""
    conditions = []
    values = []

    if incident_status:
        conditions.append("LOWER(i.status) = LOWER(%s)")
        values.append(incident_status)

    if severity:
        conditions.append("LOWER(i.severity) = LOWER(%s)")
        values.append(severity)

    if incident_type:
        conditions.append("LOWER(i.incident_type) = LOWER(%s)")
        values.append(incident_type)

    if district:
        conditions.append("LOWER(l.district) = LOWER(%s)")
        values.append(district)

    if open_only:
        conditions.append("LOWER(i.status) NOT IN ('resolved', 'closed')")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY i.reported_at DESC"
    return fetch_all(query, tuple(values))


@router.post("", status_code=status.HTTP_201_CREATED)
def create_incident(body: IncidentCreate, request: Request):
    user = get_user(request)

    location = fetch_one(
        "SELECT location_id FROM locations WHERE LOWER(name) = LOWER(%s)",
        (body.place.strip(),),
    )

    if not location:
        raise HTTPException(status_code=404, detail="Place not found")

    with pool.connection() as conn:
        incident = conn.execute(
            """INSERT INTO incidents
               (reported_by, location_id, incident_type, severity, title,
                description, latitude, longitude, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'reported')
               RETURNING incident_id, reported_by, location_id, incident_type,
                         severity, title, description, latitude, longitude,
                         status, reported_at""",
            (
                user["user_id"],
                location["location_id"],
                body.incident_type,
                body.severity,
                f"{body.incident_type} at {body.place}",
                body.description,
                body.latitude,
                body.longitude,
            ),
        ).fetchone()

        conn.execute(
            """INSERT INTO incident_updates (incident_id, updated_by, status, note)
               VALUES (%s, %s, 'reported', %s)""",
            (incident["incident_id"], user["user_id"], body.description),
        )

    return incident


@router.get("/my")
def list_my_incidents(request: Request):
    user = get_user(request)

    incidents = fetch_all(
        """SELECT i.incident_id, l.name AS place, i.incident_type,
                  i.severity, i.description, i.latitude, i.longitude,
                  i.status, i.reported_at
           FROM incidents i
           LEFT JOIN locations l ON l.location_id = i.location_id
           WHERE i.reported_by = %s
           ORDER BY i.reported_at DESC""",
        (user["user_id"],),
    )

    return incidents


@router.get("/{incident_id}")
def get_incident(incident_id: int, request: Request):
    user = get_user(request)

    incident = fetch_one(
        """SELECT i.incident_id, i.reported_by, l.name AS place,
                  i.incident_type, i.severity, i.description,
                  i.latitude, i.longitude, i.status, i.reported_at
           FROM incidents i
           LEFT JOIN locations l ON l.location_id = i.location_id
           WHERE i.incident_id = %s""",
        (incident_id,),
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident["reported_by"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=404, detail="Incident not found")

    history = fetch_all(
        """SELECT * FROM incident_updates
           WHERE incident_id = %s
           ORDER BY updated_at""",
        (incident_id,),
    )

    incident["history"] = history
    return incident


@router.post("/{incident_id}/updates")
def update_incident(
    incident_id: int,
    body: IncidentStatusUpdate,
    request: Request,
):
    user = get_user(request)
    check_authority(user)

    with pool.connection() as conn:
        incident = conn.execute(
            """UPDATE incidents
               SET status = %s,
                   resolved_at = CASE
                       WHEN %s IN ('resolved', 'closed') THEN NOW()
                       ELSE resolved_at
                   END
               WHERE incident_id = %s
               RETURNING incident_id, reported_by, status""",
            (body.status, body.status, incident_id),
        ).fetchone()

        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        conn.execute(
            """INSERT INTO incident_updates (incident_id, updated_by, status, note)
               VALUES (%s, %s, %s, %s)""",
            (incident_id, user["user_id"], body.status, body.note),
        )

        if incident["reported_by"] is not None:
            conn.execute(
                """INSERT INTO messages
                   (recipient_id, title, body, is_read, created_at)
                   VALUES (%s, %s, %s, FALSE, NOW())""",
                (
                    incident["reported_by"],
                    "Incident report update",
                    f"Your incident report #{incident_id} status is now {body.status}. {body.note}",
                ),
            )

    return {"incident_id": incident_id, "status": body.status, "message": "Incident updated"}
