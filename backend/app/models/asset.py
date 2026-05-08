import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class AssetType(str, enum.Enum):
    SERVIDOR = "SERVIDOR"
    DESKTOP = "DESKTOP"
    NOTEBOOK = "NOTEBOOK"
    IMPRESSORA = "IMPRESSORA"
    SWITCH = "SWITCH"
    ROTEADOR = "ROTEADOR"
    FIREWALL = "FIREWALL"
    APLICACAO = "APLICACAO"
    OUTRO = "OUTRO"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    asset_type = Column(Enum(AssetType), nullable=False, default=AssetType.OUTRO)
    ip_address = Column(String(45), nullable=True, index=True)
    hostname = Column(String(150), nullable=True)
    location = Column(String(150), nullable=True)
    owner = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tickets = relationship("Ticket", back_populates="asset")
