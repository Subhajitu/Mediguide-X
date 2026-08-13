from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, reports, consultations, family

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(consultations.router, prefix="/consultations", tags=["consultations"])
api_router.include_router(family.router, prefix="/family", tags=["family"])
