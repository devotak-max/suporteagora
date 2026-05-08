from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.ticket import TicketPriority, TicketStatus


class TicketCommentBase(BaseModel):
    body: str = Field(min_length=1)
    is_internal: bool = False


class TicketCommentCreate(TicketCommentBase):
    pass


class TicketCommentRead(TicketCommentBase):
    id: int
    ticket_id: int
    author_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketBase(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    priority: TicketPriority = TicketPriority.MEDIA
    category: str | None = None
    asset_id: int | None = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: TicketPriority | None = None
    status: TicketStatus | None = None
    category: str | None = None
    asset_id: int | None = None


class TicketAssign(BaseModel):
    assignee_id: int


class TicketRead(TicketBase):
    id: int
    status: TicketStatus
    requester_id: int
    assignee_id: int | None
    opened_at: datetime
    started_at: datetime | None
    closed_at: datetime | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
