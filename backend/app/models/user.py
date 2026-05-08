import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    CLIENTE = "CLIENTE"
    TECNICO = "TECNICO"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CLIENTE)
    is_active = Column(Boolean, default=True, nullable=False)
    company = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tickets_opened = relationship(
        "Ticket",
        back_populates="requester",
        foreign_keys="Ticket.requester_id",
        cascade="all, delete-orphan",
    )
    tickets_assigned = relationship(
        "Ticket",
        back_populates="assignee",
        foreign_keys="Ticket.assignee_id",
    )
    comments = relationship("TicketComment", back_populates="author", cascade="all, delete-orphan")
