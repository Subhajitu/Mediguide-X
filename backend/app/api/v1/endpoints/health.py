from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = False
    error_msg = None
    try:
        await db.execute(text("SELECT 1"))
        db_status = True
    except Exception as e:
        db_status = False
        error_msg = str(e)
        
    return {
        "status": "healthy" if db_status else "degraded",
        "database_connected": db_status,
        "error": error_msg
    }
