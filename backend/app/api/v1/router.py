from fastapi import APIRouter

from app.api.v1.endpoints import assets, auth, reports, tickets

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tickets.router)
api_router.include_router(assets.router)
api_router.include_router(reports.router)
