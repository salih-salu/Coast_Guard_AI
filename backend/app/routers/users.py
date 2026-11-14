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


# In-memory tracking of active online/on-duty users
# Maps user_id or email -> boolean (True = ON DUTY / Online)
ACTIVE_SESSIONS = set()


@router.post("/status/duty")
def set_duty_status(body: dict):
    """Sets explicit on_duty status for a user (email or user_id)."""
    user_key = str(body.get("email") or body.get("user_id", "")).strip().lower()
    is_on_duty = bool(body.get("on_duty", True))
    if user_key:
        if is_on_duty:
            ACTIVE_SESSIONS.add(user_key)
        else:
            ACTIVE_SESSIONS.discard(user_key)
    return {"user": user_key, "on_duty": is_on_duty}


@router.get("")
def list_users(
    role: str | None = None,
    place: str | None = Query(default=None),
):
    query = """SELECT u.user_id, u.full_name as name, u.email, u.phone, u.role,
                      u.user_type, u.is_active, COALESCE(l.district, 'Kerala Coast') AS location,
                      u.created_at AS registered_at
               FROM users u
               LEFT JOIN locations l ON l.location_id = u.location_id"""
    conditions = []
    values = []

    if role:
        conditions.append("LOWER(u.role) = LOWER(%s)")
        values.append(role)

    if place:
        conditions.append("LOWER(l.name) = LOWER(%s) OR LOWER(l.district) = LOWER(%s)")
        values.extend([place, place])

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY u.created_at DESC"
    users_list = fetch_all(query, tuple(values) if values else None)

    for u in users_list:
        uid_key = str(u.get("user_id", "")).lower()
        email_key = str(u.get("email", "")).lower()
        u["on_duty"] = uid_key in ACTIVE_SESSIONS or email_key in ACTIVE_SESSIONS

    return users_list


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

    # 3. Normalize role
    user_role = (body.role or "citizen").strip().lower()

    # 4. Hash password
    pwd_hash = hash_password(body.password)

    # --- Map user_type to satisfy users_user_type_check constraint ---
    # In DB check constraint: user_type MUST be one of ('resident', 'fisherman', 'tourist')
    VALID_USER_TYPES = ("resident", "fisherman", "tourist")
    if user_role == "citizen" and body.user_type in VALID_USER_TYPES:
        final_user_type = body.user_type
    else:
        final_user_type = "resident"

    new_user = None

    # Step A: Insert user with requested role
    with pool.connection() as conn:
        try:
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
                    user_role,
                    location_id,
                    final_user_type,
                ),
            ).fetchone()
            conn.commit()
        except Exception as err:
            conn.rollback()
            # If DB rejects 'volunteer' due to a check constraint on role
            print(f"Registration insert attempt with role='{user_role}' failed: {err}")
            new_user = None

    # Step B: If role='volunteer' was rejected by role check constraint, fallback to role='citizen'
    if not new_user:
        with pool.connection() as conn:
            new_user = conn.execute(
                """
                INSERT INTO users (
                    full_name, email, phone, password_hash, role,
                    preferred_language, location_id, is_active, created_at, user_type
                )
                VALUES (%s, %s, %s, %s, 'citizen', 'en', %s, TRUE, NOW(), %s)
                RETURNING user_id, full_name, email, phone, role, user_type, is_active
                """,
                (
                    body.name.strip(),
                    body.email.strip().lower(),
                    body.phone.strip() if body.phone else None,
                    pwd_hash,
                    location_id,
                    final_user_type,
                ),
            ).fetchone()
            conn.commit()

    # Step C: If volunteer_profiles table exists, attempt optional insert in a separate safe connection
    if user_role == "volunteer" and new_user:
        try:
            with pool.connection() as conn:
                conn.execute(
                    """
                    INSERT INTO volunteer_profiles (user_id, phone, latitude, longitude, is_available)
                    VALUES (%s, %s, 9.9312, 76.2673, TRUE)
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    (new_user["user_id"], body.phone.strip() if body.phone else None),
                )
                conn.commit()
        except Exception as vol_err:
            print(f"volunteer_profiles optional insert skipped: {vol_err}")

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
    email_or_user = body.email.strip().lower()

    # 1. Permanent / Hardcoded Admin credentials check
    if email_or_user in ("admin", "admin@coastalguard.gov.in", "admin@gmail.com") and body.password == "admin123":
        return {
            "message": "Login successful",
            "user": {
                "user_id": 1,
                "name": "Super Admin",
                "email": "admin@coastalguard.gov.in",
                "phone": "+91 99999 99999",
                "role": "admin",
                "user_type": "official",
                "is_active": True,
                "location": "Thiruvananthapuram (HQ)",
            },
        }

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
        (email_or_user, pwd_hash),
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_data = user[0]
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Your account has been deactivated")

    # Mark user as ON DUTY upon successful login
    uid_key = str(user_data.get("user_id", "")).lower()
    email_key = str(user_data.get("email", "")).lower()
    if uid_key:
        ACTIVE_SESSIONS.add(uid_key)
    if email_key:
        ACTIVE_SESSIONS.add(email_key)

    user_data["on_duty"] = True
    return {"message": "Login successful", "user": user_data}