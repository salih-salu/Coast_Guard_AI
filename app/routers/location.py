from fastapi import APIRouter, HTTPException, Query

from ..database import fetch_all, fetch_one

router = APIRouter(prefix="/locations", tags=["Locations"])

# 1. List all districts
@router.get("/districts")
def get_districts():
    return fetch_all(
        """
        SELECT DISTINCT district
        FROM locations
        WHERE district IS NOT NULL
        ORDER BY district
        """
    )


# 2. List locations by district
@router.get("/by-district")
def list_locations(district: str = Query(...)):
    return fetch_all(
        """
        SELECT *
        FROM locations
        WHERE LOWER(district) = LOWER(%s)
        ORDER BY name
        """,
        (district,),
    )


# 3. Get a location by ID
@router.get("/{location_id}")
def get_location(location_id: int):
    row = fetch_one(
        "SELECT * FROM locations WHERE location_id = %s",
        (location_id,),
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    return row






# @router.get("/{location_id}")
# def get_location(location_id: int):
#     row = fetch_one("SELECT * FROM locations WHERE location_id = %s", (location_id,))
#     if not row:
#         raise HTTPException(status_code=404, detail="Location not found")
#     return row
