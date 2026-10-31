
from fastapi import APIRouter, HTTPException, Query, Request, status
from ..database import fetch_all, fetch_one, pool
from ..schemas import AlertCreate, AlertUpdate

router = APIRouter(
    prefix="/alerts",
    tags=["Official alerts"]
)


def get_user(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    if user.get("role") not in ("admin", "authority"):
        raise HTTPException(status_code=403, detail="Admin or authority access required")

    return user


def get_district(area: str):
    location = fetch_one(
        """SELECT district FROM locations
           WHERE LOWER(name) = LOWER(%s) OR LOWER(district) = LOWER(%s)
           LIMIT 1""",
        (area.strip(), area.strip()),
    )

    if not location:
        raise HTTPException(status_code=404, detail="District or place not found")

    return location["district"]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_alert(body: AlertCreate, request: Request):
    user = get_user(request)
    district = get_district(body.area)

    with pool.connection() as conn:
        alert = conn.execute(
            """INSERT INTO official_alerts
               (title, alert_type, alert_level, description, affected_district,
                source_agency, issued_at, valid_until, is_active)
               VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, TRUE)
               RETURNING alert_id, title, alert_type, alert_level, description,
                         affected_district, issued_at, valid_until, is_active""",
            (
                body.title,
                body.alert_type,
                body.alert_level,
                body.description,
                district,
                user.get("agency", user["role"]),
                body.valid_until,
            ),
        ).fetchone()

    return alert


@router.patch("/{alert_id}")
def edit_alert(alert_id: int, body: AlertUpdate, request: Request):
    user = get_user(request)
    district = get_district(body.area)

    with pool.connection() as conn:
        alert = conn.execute(
            """UPDATE official_alerts
               SET title = %s,
                   alert_type = %s,
                   alert_level = %s,
                   description = %s,
                   affected_district = %s,
                   valid_until = %s,
                   updated_by = %s,
                   updated_at = NOW()
               WHERE alert_id = %s
               RETURNING alert_id, title, alert_type, alert_level, description,
                         affected_district, issued_at, valid_until, is_active,
                         updated_by, updated_at""",
            (
                body.title,
                body.alert_type,
                body.alert_level,
                body.description,
                district,
                body.valid_until,
                user["user_id"],
                alert_id,
            ),
        ).fetchone()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return alert


@router.patch("/{alert_id}/deactivate")
def deactivate_alert(alert_id: int, request: Request):
    user = get_user(request)

    with pool.connection() as conn:
        alert = conn.execute(
            """UPDATE official_alerts
               SET is_active = FALSE, updated_by = %s, updated_at = NOW()
               WHERE alert_id = %s AND is_active = TRUE
               RETURNING alert_id, title, is_active, updated_by, updated_at""",
            (user["user_id"], alert_id),
        ).fetchone()

    if not alert:
        raise HTTPException(status_code=404, detail="Active alert not found")

    return alert




@router.get("")
def list_alerts(
    district: str | None = Query(default=None),
    alert_level: str | None = Query(default=None),
    alert_type: str | None = Query(default=None),
    active_only: bool = Query(default=False),
):
    where = []
    params = []

    # Treat whitespace-only values as omitted and normalize incoming filters.
    district = district.strip() if district and district.strip() else None
    alert_level = alert_level.strip() if alert_level and alert_level.strip() else None
    alert_type = alert_type.strip() if alert_type and alert_type.strip() else None
    if alert_type:
        # The database stores types such as "heavy_rain" while clients may
        # naturally send "heavy rain".
        alert_type = "_".join(alert_type.split())

    if active_only:
        where.append("is_active = TRUE")
        where.append("(valid_until IS NULL OR valid_until > NOW())")

    if district:
        where.append("LOWER(affected_district) = LOWER(%s)")
        params.append(district)

    if alert_level:
        where.append("LOWER(alert_level) = LOWER(%s)")
        params.append(alert_level)

    if alert_type:
        where.append("LOWER(alert_type) = LOWER(%s)")
        params.append(alert_type)

    sql = """
        SELECT
            alert_id,
            title,
            alert_type,
            alert_level, 
            description,
            affected_district,
            issued_at,
            valid_until
        FROM official_alerts
    """

    if where:
        sql += " WHERE " + " AND ".join(where)

    sql += """
        ORDER BY
            CASE LOWER(alert_level)
                WHEN 'red' THEN 1
                WHEN 'orange' THEN 2
                WHEN 'yellow' THEN 3
                ELSE 4
            END,
            issued_at DESC
    """

    return fetch_all(sql, tuple(params))


# Get one alert by ID
@router.get("/{alert_id}")
def get_alert(alert_id: int):
    row = fetch_one(
        """
        SELECT
            alert_id,
            title,
            alert_type,
            alert_level,
            description,
            affected_district,
            source_agency, 
            issued_at,
            valid_until,
            is_active
        FROM official_alerts
        WHERE alert_id = %s
        """,
        (alert_id,),
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return row
