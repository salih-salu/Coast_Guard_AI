import re

import httpx
from fastapi import APIRouter, HTTPException

from .. import config
from ..database import fetch_all, fetch_one
from ..schemas import ChatRequest
from ..services import knowledge_service, llm_service, weather_service

router = APIRouter(prefix="/chat", tags=["Chat"])

MAX_RESULTS = 5


def _contains_any(message: str, terms: tuple[str, ...]) -> bool:
    return any(re.search(rf"\b{re.escape(term)}\b", message) for term in terms)


def _find_location(message: str):
    return fetch_one(
        """SELECT location_id, name, district, latitude, longitude
           FROM locations
           WHERE POSITION(LOWER(name) IN LOWER(%s)) > 0
              OR POSITION(LOWER(district) IN LOWER(%s)) > 0
           ORDER BY
               CASE
                   WHEN POSITION(LOWER(name) IN LOWER(%s)) > 0 THEN 0
                   ELSE 1
               END,
               LENGTH(name) DESC
           LIMIT 1""",
        (message, message, message),
    )


def _place_hint(location) -> str:
    if location:
        return f" near {location['name']}"
    return ""


def _weather_reply(location, location_query: str | None = None):
    if not location:
        if not location_query:
            return {
                "reply": "Which place or district do you need current weather for?",
                "intent": "weather",
                "data": None,
            }
        try:
            location = weather_service.geocode_location(location_query)
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise HTTPException(
                status_code=503,
                detail="Live weather is temporarily unavailable. Please try again shortly.",
            ) from exc
        if not location:
            return {
                "reply": (
                    f"I couldn't find weather for {location_query}. "
                    "Please specify a city or district."
                ),
                "intent": "weather",
                "data": None,
            }

    try:
        weather = weather_service.get_weather(location)
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Live weather is temporarily unavailable. Please try again shortly.",
        ) from exc

    place = f", {location['district']}" if location.get("district") else ""
    reply = f"Current weather for {location['name']}{place}: {weather['condition']}."
    if weather.get("temperature") is not None:
        reply += (
            f" Temperature: {weather['temperature']}"
            f"{weather.get('temperature_unit') or ''}."
        )
    if weather.get("feels_like") is not None:
        reply += (
            f" Feels like {weather['feels_like']}"
            f"{weather.get('temperature_unit') or ''}."
        )
    if weather.get("humidity") is not None:
        reply += (
            f" Humidity: {weather['humidity']}"
            f"{weather.get('humidity_unit') or ''}."
        )
    if weather.get("wind_speed") is not None:
        reply += (
            f" Wind: {weather['wind_speed']} "
            f"{weather.get('wind_speed_unit') or ''}."
        )
    if weather.get("observed_at"):
        reply += f" Reported at {weather['observed_at']}."
    return {
        "reply": reply,
        "intent": "weather",
        "data": {
            "location": location["name"],
            "district": location["district"],
            "weather": weather,
            "source": "Open-Meteo",
        },
    }


def _alerts_reply(location):
    conditions = [
        "is_active = TRUE",
        "(valid_until IS NULL OR valid_until > NOW())",
    ]
    params = []
    if location:
        conditions.append("LOWER(affected_district) = LOWER(%s)")
        params.append(location["district"])

    alerts = fetch_all(
        f"""SELECT alert_id, title, alert_type, alert_level, description,
                   affected_district, issued_at, valid_until
            FROM official_alerts
            WHERE {" AND ".join(conditions)}
            ORDER BY
                CASE LOWER(alert_level)
                    WHEN 'red' THEN 1
                    WHEN 'orange' THEN 2
                    WHEN 'yellow' THEN 3
                    ELSE 4
                END,
                issued_at DESC
            LIMIT %s""",
        (*params, MAX_RESULTS),
    )
    place = f" in {location['district']}" if location else ""
    reply = (
        f"I found {len(alerts)} active alert(s){place}."
        if alerts
        else f"There are no active alerts in my database{place}."
    )
    return {"reply": reply, "intent": "alerts", "data": alerts}


def _shelters_reply(location):
    conditions = ["s.is_open = TRUE", "s.current_occupancy < s.capacity"]
    params = []
    if location:
        conditions.append(
            "(LOWER(l.name) = LOWER(%s) OR LOWER(l.district) = LOWER(%s))"
        )
        params.extend((location["name"], location["district"]))

    shelters = fetch_all(
        f"""SELECT s.shelter_id, s.name, s.address, s.capacity,
                   s.current_occupancy, s.capacity - s.current_occupancy AS free_space,
                   l.name AS place, l.district
            FROM shelters s
            JOIN locations l ON l.location_id = s.location_id
            WHERE {" AND ".join(conditions)}
            ORDER BY free_space DESC, s.name
            LIMIT %s""",
        (*params, MAX_RESULTS),
    )
    place = _place_hint(location)
    reply = (
        f"I found {len(shelters)} open shelter(s) with available space{place}."
        if shelters
        else f"I couldn't find an open shelter with available space{place}."
    )
    return {"reply": reply, "intent": "shelters", "data": shelters}


def _precautions_reply(message: str, classified_hazard: str | None = None):
    hazards = (
        "flood",
        "rain",
        "cyclone",
        "storm",
        "tsunami",
        "landslide",
        "lightning",
    )
    hazard = classified_hazard or next(
        (term for term in hazards if _contains_any(message, (term,))),
        None,
    )
    conditions = []
    params = []
    if hazard:
        conditions.append("LOWER(hazard_type) LIKE %s")
        params.append(f"%{hazard}%")

    precautions = fetch_all(
        """SELECT precaution_id, hazard_type, phase, audience, title, instructions
           FROM precautions"""
        + (f" WHERE {' AND '.join(conditions)}" if conditions else "")
        + """ ORDER BY hazard_type,
                   CASE phase WHEN 'before' THEN 1 WHEN 'during' THEN 2 ELSE 3 END
           LIMIT %s""",
        (*params, MAX_RESULTS),
    )
    reply = (
        f"Here are safety precautions for {hazard}:"
        if hazard and precautions
        else "Here are safety precautions from the database:"
        if precautions
        else f"I couldn't find precautions for {hazard} in the database."
        if hazard
        else "I couldn't find any safety precautions in the database."
    )
    try:
        passages = knowledge_service.retrieve(message)
    except (OSError, UnicodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="The safety knowledge base could not be read.",
        ) from exc
    sources = [
        {
            "reference": passage["reference"],
            "title": passage["title"],
            "section": passage["section"],
            "source": passage["source"],
            "updated": passage["updated"],
            "status": passage["status"],
        }
        for passage in passages
    ]
    return {
        "reply": reply,
        "intent": "precautions",
        "data": {"database_precautions": precautions, "knowledge": passages},
        "sources": sources,
    }


def _knowledge_reply(message: str):
    try:
        passages = knowledge_service.retrieve(message)
    except (OSError, UnicodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="The safety knowledge base could not be read.",
        ) from exc
    sources = [
        {
            "reference": passage["reference"],
            "title": passage["title"],
            "section": passage["section"],
            "source": passage["source"],
            "updated": passage["updated"],
            "status": passage["status"],
        }
        for passage in passages
    ]
    return {
        "reply": "",
        "intent": "knowledge",
        "data": {"knowledge": passages},
        "sources": sources,
    }


def _contacts_reply(location, message: str):
    conditions = ["c.district IS NULL"]
    params = []
    if location:
        conditions = [
            "(c.district IS NULL OR LOWER(c.district) = LOWER(%s))"
        ]
        params.append(location["district"])

    contacts = fetch_all(
        f"""SELECT c.contact_id, c.name, c.organization, c.category, c.phone,
                   c.alternate_phone, c.district, c.is_24x7
            FROM emergency_contacts c
            WHERE {" AND ".join(conditions)}
            ORDER BY (c.district IS NOT NULL), c.category, c.name
            LIMIT %s""",
        (*params, MAX_RESULTS),
    )
    reply = "For immediate danger, call 112. " if "emergency" in message.casefold() else ""
    reply += (
        f"Here are emergency contacts{_place_hint(location)}."
        if contacts
        else f"I couldn't find emergency contacts{_place_hint(location)}."
    )
    return {"reply": reply, "intent": "emergency_contacts", "data": contacts}


@router.post("")
def chat(body: ChatRequest):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message must not be blank")

    try:
        classification = llm_service.classify_message(message)
        location_query = classification["location"]
        location = _find_location(location_query) if location_query else None
        intent = classification["intent"]
        if intent == "weather":
            return _weather_reply(location, location_query)
        elif intent == "alerts":
            result = _alerts_reply(location)
        elif intent == "shelters":
            result = _shelters_reply(location)
        elif intent == "precautions":
            result = _precautions_reply(message, classification["hazard"])
        elif intent == "knowledge":
            result = _knowledge_reply(message)
        elif intent == "emergency_contacts":
            result = _contacts_reply(location, message)
        else:
            result = {"reply": "", "intent": intent, "data": None}

        result["reply"] = llm_service.generate_reply(
            message,
            result["intent"],
            result["data"],
        )
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "The local chat model is unavailable. Start Ollama and make sure "
                f"the '{config.OLLAMA_MODEL}' model is installed."
            ),
        ) from exc
    return result
