from fastapi import APIRouter, HTTPException, Query, Request, status

from ..database import fetch_one, pool
from ..schemas import ShelterCreate, ShelterOccupancyUpdate, ShelterUpdate

router = APIRouter(prefix="/shelters", tags=["Shelters"])


def get_user(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    if user.get("role") not in ("admin", "authority"):
        raise HTTPException(status_code=403, detail="Admin or authority access required")

    return user


def get_location(place: str):
    location = fetch_one(
        "SELECT location_id FROM locations WHERE LOWER(name) = LOWER(%s)",
        (place.strip(),),
    )

    if not location:
        raise HTTPException(status_code=404, detail="Place not found")

    return location["location_id"]


@router.get("/nearest")
def get_nearest_shelter(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
):
    shelter = fetch_one(
        """SELECT s.shelter_id, s.name, s.address, s.capacity,
                  s.current_occupancy,
                  s.capacity - s.current_occupancy AS free_space,
                  l.name AS place, l.district,
                  6371 * 2 * ASIN(SQRT(
                      POWER(SIN(RADIANS(l.latitude - %s) / 2), 2) +
                      COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                      POWER(SIN(RADIANS(l.longitude - %s) / 2), 2)
                  )) AS distance_km
           FROM shelters s
           JOIN locations l ON l.location_id = s.location_id
           WHERE s.is_open = TRUE
             AND s.current_occupancy < s.capacity
           ORDER BY distance_km
           LIMIT 1""",
        (lat, lat, lng),
    )

    if not shelter:
        raise HTTPException(status_code=404, detail="No nearby shelter has free space")

    return shelter


@router.post("", status_code=status.HTTP_201_CREATED)
def create_shelter(body: ShelterCreate, request: Request):
    get_user(request)

    if body.current_occupancy > body.capacity:
        raise HTTPException(status_code=422, detail="Occupancy cannot exceed capacity")

    location_id = get_location(body.place)

    with pool.connection() as conn:
        shelter = conn.execute(
            """INSERT INTO shelters
               (name, location_id, address, capacity, current_occupancy, is_open)
               VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING shelter_id, name, location_id, address, capacity,
                         current_occupancy, is_open""",
            (
                body.name,
                location_id,
                body.address,
                body.capacity,
                body.current_occupancy,
                body.is_open,
            ),
        ).fetchone()

    return shelter


@router.patch("/{shelter_id}")
def edit_shelter(shelter_id: int, body: ShelterUpdate, request: Request):
    get_user(request)

    location_id = None
    if body.place:
        location_id = get_location(body.place)

    with pool.connection() as conn:
        shelter = conn.execute(
            """UPDATE shelters
               SET name = COALESCE(%s, name),
                   location_id = COALESCE(%s, location_id),
                   address = COALESCE(%s, address),
                   capacity = COALESCE(%s, capacity),
                   is_open = COALESCE(%s, is_open)
               WHERE shelter_id = %s
                 AND current_occupancy <= COALESCE(%s, capacity)
               RETURNING shelter_id, name, location_id, address, capacity,
                         current_occupancy, is_open""",
            (
                body.name,
                location_id,
                body.address,
                body.capacity,
                body.is_open,
                shelter_id,
                body.capacity,
            ),
        ).fetchone()

    if not shelter:
        existing_shelter = fetch_one(
            "SELECT shelter_id FROM shelters WHERE shelter_id = %s",
            (shelter_id,),
        )
        if not existing_shelter:
            raise HTTPException(status_code=404, detail="Shelter not found")
        raise HTTPException(status_code=422, detail="Capacity cannot be below current occupancy")

    return shelter


@router.patch("/{shelter_id}/occupancy")
def update_occupancy(
    shelter_id: int,
    body: ShelterOccupancyUpdate,
    request: Request,
):
    get_user(request)

    with pool.connection() as conn:
        shelter = conn.execute(
            """UPDATE shelters
               SET current_occupancy = %s
               WHERE shelter_id = %s AND %s <= capacity
               RETURNING shelter_id, current_occupancy, capacity""",
            (body.current_occupancy, shelter_id, body.current_occupancy),
        ).fetchone()

    if not shelter:
        existing_shelter = fetch_one(
            "SELECT shelter_id FROM shelters WHERE shelter_id = %s",
            (shelter_id,),
        )
        if not existing_shelter:
            raise HTTPException(status_code=404, detail="Shelter not found")
        raise HTTPException(status_code=422, detail="Occupancy cannot exceed capacity")

    return shelter