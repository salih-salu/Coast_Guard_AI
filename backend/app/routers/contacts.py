from fastapi import APIRouter

from ..database import fetch_all

router = APIRouter(prefix="/contacts", tags=["Emergency contacts"])


@router.get("")
def list_contacts(
    district: str | None = None,
    category: str | None = None,
    include_statewide: bool = True,
):
    where = []
    params = []

    if district:
        if include_statewide:
            # also include state/national numbers such as 112 and 108 (district is NULL)
            where.append("(LOWER(c.district) = LOWER(%s) OR c.district IS NULL)")
        else:
            where.append("LOWER(c.district) = LOWER(%s)")
        params.append(district)
    if category:
        where.append("c.category = %s")
        params.append(category)

    sql = """
        SELECT c.contact_id, c.name, c.organization, c.category, c.phone,
               c.alternate_phone, c.district, l.name AS location_name, c.is_24x7
        FROM emergency_contacts c
        LEFT JOIN locations l ON l.location_id = c.location_id
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY (c.district IS NOT NULL), c.district, c.category, c.name"
    return fetch_all(sql, params)