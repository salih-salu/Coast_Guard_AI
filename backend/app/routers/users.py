from fastapi import APIRouter, HTTPException, Query, Request

import hashlib

from ..database import fetch_all, pool
from ..schemas import UserActiveUpdate, UserRoleUpdate, UserRegister, UserLogin

router = APIRouter(prefix="/users", tags=["Users"])


def get_admin(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return user
# ..........................................................................................
def hash_password(password: str) -> str:
    """Simple SHA-256 password hash (or use bcrypt/passlib)"""
    return hashlib.sha256(password.encode()).hexdigest()
# ..........................................................................................


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



# ..........................................................................................
import hashlib
from ..schemas import UserRegister, UserLogin


def hash_password(password: str) -> str:
    """Hash password with SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


# -------------------------------------------------------------------------
# REGISTRATION ENDPOINT (Supports citizen, volunteer, authority, admin)
# -------------------------------------------------------------------------
@router.post("/register", status_code=201)
def register(body: UserRegister):
    # 1. Check if email is already taken
    existing = fetch_all(
        "SELECT user_id FROM users WHERE LOWER(email) = LOWER(%s)",
        (body.email.strip(),),
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # 2. Resolve location_id from district name if provided
    location_id = None
    if body.location:
        loc = fetch_all(
            "SELECT location_id FROM locations WHERE LOWER(district) = LOWER(%s) LIMIT 1",
            (body.location.strip(),),
        )
        if loc:
            location_id = loc[0]["location_id"]

    # 3. Normalize role & map to valid user_type
    user_role = (body.role or "citizen").strip().lower()
    
    # Mapping to satisfy PostgreSQL check constraint `users_user_type_check`
    role_to_user_type = {
        "citizen": "public",
        "volunteer": "volunteer",
        "authority": "official",
        "admin": "official",
    }
    db_user_type = role_to_user_type.get(user_role, "public")

    # 4. Hash password
    pwd_hash = hash_password(body.password)

    final_user_type = body.user_type if (body.role == "citizen" and body.user_type) else body.role
    with pool.connection() as conn:
        new_user = conn.execute(
            """
            INSERT INTO users (
                full_name, email, phone, password_hash, role,
                preferred_language, location_id, is_active, created_at, user_type
            )
            VALUES (%s, %s, %s, %s, %s, 'en', %s, TRUE, NOW(), %s)
            RETURNING user_id, full_name, email, phone, role, user_type, is_active
            """,
            (
                body.name.strip(),
                body.email.strip().lower(),
                body.phone.strip() if body.phone else None,
                pwd_hash,
                body.role,
                location_id,
                final_user_type,  # <-- Stores "fisherman", "resident", "volunteer", etc.
            ),
        ).fetchone()

        # 6. If role is volunteer, also create entry in volunteer_profiles
        if user_role == "volunteer":
            conn.execute(
                """
                INSERT INTO volunteer_profiles (user_id, phone, is_available)
                VALUES (%s, %s, TRUE)
                ON CONFLICT (user_id) DO NOTHING
                """,
                (new_user["user_id"], body.phone.strip() if body.phone else None),
            )

        # Ensure location is included in user object returned
    new_user_dict = dict(new_user)
    new_user_dict["location"] = body.location
    new_user_dict["name"] = new_user_dict.get("full_name")
    return {"message": "Registration successful", "user": new_user_dict}


# -------------------------------------------------------------------------
# LOGIN ENDPOINT
# -------------------------------------------------------------------------
@router.post("/login")
def login(body: UserLogin):
    pwd_hash = hash_password(body.password)
    user = fetch_all(
        """
        SELECT u.user_id, u.full_name as name, u.email, u.phone, u.role, 
               u.user_type, u.is_active, l.district as location
        FROM users u
        LEFT JOIN locations l ON l.location_id = u.location_id
        WHERE LOWER(u.email) = LOWER(%s) AND u.password_hash = %s
        LIMIT 1
        """,
        (body.email.strip(), pwd_hash),
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_data = user[0]
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Your account has been deactivated")

    return {"message": "Login successful", "user": user_data}