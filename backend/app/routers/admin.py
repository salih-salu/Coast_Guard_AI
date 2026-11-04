from fastapi import APIRouter, HTTPException, Request

from ..database import fetch_all, fetch_one

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_authority_user(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    if user.get("role") not in ("admin", "authority"):
        raise HTTPException(status_code=403, detail="Admin or authority access required")

    return user


@router.get("/stats")
def get_stats(request: Request):
    get_authority_user(request)

    incidents_by_status = fetch_all(
        """SELECT status, COUNT(*) AS count
           FROM incidents
           WHERE LOWER(status) NOT IN ('resolved', 'closed')
           GROUP BY status
           ORDER BY status"""
    )

    incidents_by_severity = fetch_all(
        """SELECT severity, COUNT(*) AS count
           FROM incidents
           WHERE LOWER(status) NOT IN ('resolved', 'closed')
           GROUP BY severity
           ORDER BY severity"""
    )

    sos_counts = fetch_one(
        """SELECT COUNT(*) AS total_sos_count,
                  COUNT(*) FILTER (
                      WHERE LOWER(status) NOT IN ('resolved', 'closed')
                  ) AS open_sos_count
           FROM incidents
           WHERE incident_type = 'sos_emergency'"""
    )

    active_alerts = fetch_one(
        """SELECT COUNT(*) AS active_alert_count
           FROM official_alerts
           WHERE is_active = TRUE
             AND (valid_until IS NULL OR valid_until > NOW())"""
    )

    camp_totals = fetch_one(
        """SELECT COALESCE(SUM(current_occupancy), 0) AS people_in_camps,
                  COALESCE(SUM(capacity - current_occupancy), 0) AS free_space
           FROM shelters
           WHERE is_open = TRUE"""
    )

    return {
        "open_incidents_by_status": incidents_by_status,
        "open_incidents_by_severity": incidents_by_severity,
        "sos_count": sos_counts["total_sos_count"],
        "open_sos_count": sos_counts["open_sos_count"],
        "active_alert_count": active_alerts["active_alert_count"],
        "people_in_camps": camp_totals["people_in_camps"],
        "free_space": camp_totals["free_space"],
    }
