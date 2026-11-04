from fastapi import APIRouter, HTTPException, Request

from ..database import fetch_all, fetch_one, pool
from ..schemas import MessageCreate

router = APIRouter(prefix="/messages", tags=["Messages"])


def get_user(request: Request):
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")

    return user


@router.post("")
def send_message(body: MessageCreate, request: Request):
    user = get_user(request)
    role = user.get("role")

    # A message with an area and no incident or recipient is a broadcast.
    if body.area and not body.incident_id and not body.recipient_id:
        if role not in ("admin", "authority"):
            raise HTTPException(status_code=403, detail="Only admin or authority can send broadcasts")

        place = fetch_one(
            """SELECT district FROM locations
               WHERE LOWER(name) = LOWER(%s) OR LOWER(district) = LOWER(%s)
               LIMIT 1""",
            (body.area.strip(), body.area.strip()),
        )
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")

        with pool.connection() as conn:
            message = conn.execute(
                """INSERT INTO messages
                   (sender_id, recipient_id, incident_id, district, title, body,
                    is_read, created_at)
                   VALUES (%s, NULL, NULL, %s, %s, %s, FALSE, NOW())
                   RETURNING *""",
                (user["user_id"], place["district"], body.title, body.body),
            ).fetchone()

        return message

    # Direct messages must be connected to an incident.
    if not body.incident_id or body.area:
        raise HTTPException(status_code=422, detail="Give an incident ID, or an area for a broadcast")

    incident = fetch_one(
        "SELECT incident_id, reported_by FROM incidents WHERE incident_id = %s",
        (body.incident_id,),
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Users may only reply about their own incident.
    if role not in ("admin", "authority"):
        if incident["reported_by"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="You can only message about your own incident")
        if not body.recipient_id:
            raise HTTPException(status_code=422, detail="Give the recipient ID for your reply")
        recipient_id = body.recipient_id
    else:
        # An authority message about an incident goes to its reporter.
        recipient_id = incident["reported_by"]
        if recipient_id is None:
            raise HTTPException(status_code=422, detail="This incident has no reporter to message")

    with pool.connection() as conn:
        message = conn.execute(
            """INSERT INTO messages
               (sender_id, recipient_id, incident_id, title, body, is_read, created_at)
               VALUES (%s, %s, %s, %s, %s, FALSE, NOW())
               RETURNING *""",
            (user["user_id"], recipient_id, body.incident_id, body.title, body.body),
        ).fetchone()

    return message


@router.get("/inbox")
def get_inbox(request: Request):
    user = get_user(request)

    messages = fetch_all(
        """SELECT * FROM messages
           WHERE recipient_id = %s
              OR (recipient_id IS NULL AND district = %s)
           ORDER BY created_at DESC""",
        (user["user_id"], user.get("district")),
    )

    return messages


@router.get("/unread-count")
def get_unread_count(request: Request):
    user = get_user(request)

    result = fetch_one(
        """SELECT COUNT(*) AS unread_count FROM messages
           WHERE is_read = FALSE
             AND (recipient_id = %s
                  OR (recipient_id IS NULL AND district = %s))""",
        (user["user_id"], user.get("district")),
    )

    return result


@router.patch("/{message_id}/read")
def mark_message_read(message_id: int, request: Request):
    user = get_user(request)

    with pool.connection() as conn:
        result = conn.execute(
            """UPDATE messages SET is_read = TRUE
               WHERE message_id = %s
                 AND (recipient_id = %s
                      OR (recipient_id IS NULL AND district = %s))
               RETURNING message_id, is_read""",
            (message_id, user["user_id"], user.get("district")),
        ).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Message not found")

    return result
