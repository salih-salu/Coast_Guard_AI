from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .routers import admin, alerts, assignments, contacts, incidents, location, messages, precaution, shelters, sos, users, volunteers, weather


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.open_pool()   # connect to PostgreSQL when the server starts
    yield
    database.close_pool()  # disconnect when it stops


app = FastAPI(title="Coastal Kerala Disaster Management API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine while developing; restrict before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health():
    database.fetch_one("SELECT 1")
    return {"status": "ok", "database": "connected"}


# plug each feature's router into the app
app.include_router(location.router)
app.include_router(alerts.router)
app.include_router(contacts.router)
app.include_router(precaution.router)
app.include_router(weather.router)
app.include_router(sos.router)
app.include_router(incidents.router)
app.include_router(messages.router)
app.include_router(shelters.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(volunteers.router)
app.include_router(assignments.router)

