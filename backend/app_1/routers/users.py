from fastapi import APIRouter, HTTPException, Query, Request

from ..database import fetch_all, pool
from ..schemas import UserActiveUpdate, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["Users"])


def get_admin(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return user


@router.get("")
def list_users(
    request: Request,
    role: str | None = None,
    place: str | None = Query(default=None),
):
    get_admin(request)

    query = """SELECT u.user_id, u.name, u.email, u.role,
                      u.is_active, l.name AS place
               FROM users u
               LEFT JOIN locations l ON l.location_id = u.location_id"""
    conditions = []
    values = []

    if role:
        conditions.append("LOWER(u.role) = LOWER(%s)")
        values.append(role)

    if place:
        conditions.append("LOWER(l.name) = LOWER(%s)")
        values.append(place)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY u.name"
    return fetch_all(query, tuple(values))


@router.patch("/{user_id}/role")
def change_user_role(user_id: int, body: UserRoleUpdate, request: Request):
    get_admin(request)

    with pool.connection() as conn:
        user = conn.execute(
            """UPDATE users
               SET role = %s
               WHERE user_id = %s
               RETURNING user_id, name, email, role, is_active""",
            (body.role, user_id),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.patch("/{user_id}/active")
def change_user_active_status(
    user_id: int,
    body: UserActiveUpdate,
    request: Request,
):
    admin = get_admin(request)

    if admin.get("user_id") == user_id and not body.is_active:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    with pool.connection() as conn:
        user = conn.execute(
            """UPDATE users
               SET is_active = %s
               WHERE user_id = %s
               RETURNING user_id, name, email, role, is_active""",
            (body.is_active, user_id),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
