from fastapi import APIRouter

from ..database import fetch_all

router = APIRouter(prefix="/precautions", tags=["Precautions"])


@router.get("")
def list_precautions(
    hazard_type: str | None = None,
    phase: str | None = None,      # before / during / after
    audience: str | None = None,   # resident / fisherman / tourist
):
    where, params = [], []

    if hazard_type:
        where.append("hazard_type = %s")
        params.append(hazard_type)
    if phase:
        where.append("phase = %s")
        params.append(phase)
    if audience:
        # advice written for everyone applies to every audience
        where.append("(audience = %s OR audience = 'all')")
        params.append(audience)

    sql = "SELECT precaution_id, hazard_type, phase, audience, title, instructions FROM precautions"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += """
        ORDER BY hazard_type,
                 CASE phase WHEN 'before' THEN 1 WHEN 'during' THEN 2 ELSE 3 END
    """
    return fetch_all(sql, params)