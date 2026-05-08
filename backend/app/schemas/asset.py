from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.asset import AssetType


class AssetBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    asset_type: AssetType = AssetType.OUTRO
    ip_address: str | None = None
    hostname: str | None = None
    location: str | None = None
    owner: str | None = None
    description: str | None = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: str | None = None
    asset_type: AssetType | None = None
    ip_address: str | None = None
    hostname: str | None = None
    location: str | None = None
    owner: str | None = None
    description: str | None = None


class AssetRead(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
