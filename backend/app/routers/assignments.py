from fastapi import APIRouter, HTTPException, Request, status

from ..database import fetch_all, fetch_one, pool
from ..schemas import AssignmentCreate, AssignmentUpdate

router = APIRouter(prefix="/assignments", tags=["Assignments"])


def get_user(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")
    return user


def check_authority(user):
    if user.get("role") not in ("admin", "authority"):
        raise HTTPException(status_code=403, detail="Admin or authority access required")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_assignment(body: AssignmentCreate, request: Request):
    user = get_user(request)
    check_authority(user)

    incident = fetch_one(
        "SELECT incident_id FROM incidents WHERE incident_id = %s",
        (body.incident_id,),
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    volunteer = fetch_one(
        "SELECT user_id FROM volunteer_profiles WHERE user_id = %s",
        (body.volunteer_id,),
    )
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    with pool.connection() as conn:
        assignment = conn.execute(
            """INSERT INTO assignments
               (incident_id, volunteer_id, assigned_by, task, status, assigned_at, updated_at)
               VALUES (%s, %s, %s, %s, 'assigned', NOW(), NOW())
               RETURNING *""",
            (body.incident_id, body.volunteer_id, user["user_id"], body.task),
        ).fetchone()

    return assignment


@router.get("")
def list_assignments(request: Request):
    user = get_user(request)
    check_authority(user)

    return fetch_all(
        """SELECT * FROM assignments
           ORDER BY assigned_at DESC"""
    )


@router.get("/my")
def list_my_assignments(request: Request):
    user = get_user(request)

    return fetch_all(
        """SELECT * FROM assignments
           WHERE volunteer_id = %s
           ORDER BY assigned_at DESC""",
        (user["user_id"],),
    )


@router.patch("/{assignment_id}")
def update_assignment(
    assignment_id: int,
    body: AssignmentUpdate,
    request: Request,
):
    user = get_user(request)

    with pool.connection() as conn:
        if user.get("role") in ("admin", "authority"):
            assignment = conn.execute(
                """UPDATE assignments
                   SET status = %s, updated_at = NOW()
                   WHERE assignment_id = %s
                   RETURNING *""",
                (body.status, assignment_id),
            ).fetchone()
        else:
            assignment = conn.execute(
                """UPDATE assignments
                   SET status = %s, updated_at = NOW()
                   WHERE assignment_id = %s AND volunteer_id = %s
                   RETURNING *""",
                (body.status, assignment_id, user["user_id"]),
            ).fetchone()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    return assignment
