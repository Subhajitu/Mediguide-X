from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.services.s3 import s3_service
from app.services.bedrock import bedrock_service
import datetime
import botocore.exceptions

router = APIRouter()

class HealthStatusResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    database_connected: bool
    s3_accessible: bool
    bedrock_accessible: bool
    timestamp: datetime.datetime

@router.get("/", response_model=HealthStatusResponse)
async def health_check(response: Response, db: AsyncSession = Depends(get_db)):
    db_status = False
    s3_status = False
    bedrock_status = False
    
    # 1. DB Ping
    try:
        await db.execute(text("SELECT 1"))
        db_status = True
    except Exception:
        pass

    # 2. S3 Check
    try:
        s3_service.s3_client.head_bucket(Bucket=s3_service.bucket_name)
        s3_status = True
    except Exception:
        pass

    # 3. Bedrock Check
    try:
        # A simple lightweight call to check AWS connectivity for Bedrock
        bedrock_service.bedrock_runtime.meta.client.list_tags_for_resource(
            resourceARN=f"arn:aws:bedrock:{bedrock_service.bedrock_runtime.meta.region_name}::foundation-model/{bedrock_service.model_id_lite}"
        )
        # Even if access denied for tags, if it reaches Bedrock and returns a Bedrock error instead of network error, it's accessible.
        bedrock_status = True
    except botocore.exceptions.ClientError as e:
        # If the error is an access denied (e.g. no permission for tags), but Bedrock is reachable, we consider it connected.
        if e.response['Error']['Code'] in ['AccessDeniedException', 'ResourceNotFoundException']:
            bedrock_status = True
    except Exception:
        pass

    # Evaluate overall status
    is_healthy = db_status and s3_status and bedrock_status
    if is_healthy:
        overall_status = "healthy"
    elif db_status: # DB is up but AWS services might be down, still partially usable? No, sprint says 503 if any core disconnected
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthStatusResponse(
        status=overall_status,
        database_connected=db_status,
        s3_accessible=s3_status,
        bedrock_accessible=bedrock_status,
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )
