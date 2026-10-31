from typing import Literal

from pydantic import BaseModel, Field


class SOSRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    phone: str | None = Field(default=None, pattern=r"^\+?\d{10,13}$")
    message: str | None = Field(default=None, max_length=500)


class IncidentCreate(BaseModel):
    place: str = Field(min_length=1, max_length=200)
    incident_type: str = Field(min_length=1, max_length=100)
    severity: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=2000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class IncidentStatusUpdate(BaseModel):
    status: Literal["verified", "in_progress", "resolved", "closed"]
    note: str = Field(min_length=1, max_length=1000)


class AlertCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    alert_type: str = Field(min_length=1, max_length=100)
    alert_level: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=2000)
    area: str = Field(min_length=1, max_length=200)
    valid_until: str | None = None


class AlertUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    alert_type: str = Field(min_length=1, max_length=100)
    alert_level: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=2000)
    area: str = Field(min_length=1, max_length=200)
    valid_until: str | None = None


class ShelterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    place: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=1, max_length=500)
    capacity: int = Field(ge=1)
    current_occupancy: int = Field(default=0, ge=0)
    is_open: bool = True


class ShelterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    place: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    capacity: int | None = Field(default=None, ge=1)
    is_open: bool | None = None


class ShelterOccupancyUpdate(BaseModel):
    current_occupancy: int = Field(ge=0)


class MessageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=2000)
    incident_id: int | None = Field(default=None, gt=0)
    recipient_id: int | None = Field(default=None, gt=0)
    area: str | None = Field(default=None, min_length=1, max_length=200)


class UserRoleUpdate(BaseModel):
    role: Literal["user", "admin", "authority", "volunteer"]


class UserActiveUpdate(BaseModel):
    is_active: bool


class VolunteerRegister(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    skills: str | None = Field(default=None, max_length=1000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class VolunteerAvailability(BaseModel):
    is_available: bool


class AssignmentCreate(BaseModel):
    incident_id: int = Field(gt=0)
    volunteer_id: int = Field(gt=0)
    task: str = Field(min_length=1, max_length=1000)


class AssignmentUpdate(BaseModel):
    status: Literal["assigned", "in_progress", "completed", "cancelled"]
