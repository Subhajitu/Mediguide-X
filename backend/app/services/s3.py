import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import uuid

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=boto3.session.Config(signature_version='s3v4')
        )
        self.bucket_name = settings.AWS_S3_BUCKET_NAME

    def _generate_unique_s3_key(self, family_member_id: uuid.UUID, filename: str) -> str:
        """Generate a unique S3 key for a given file to prevent collisions."""
        extension = filename.split('.')[-1]
        unique_id = uuid.uuid4()
        return f"patients/{family_member_id}/reports/{unique_id}.{extension}"

    def generate_presigned_upload_url(self, family_member_id: uuid.UUID, filename: str, content_type: str, expires_in: int = 900) -> dict:
        """
        Generate a pre-signed URL to allow the frontend to upload a file directly to S3.
        """
        s3_key = self._generate_unique_s3_key(family_member_id, filename)
        try:
            response = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            return {
                "upload_url": response,
                "s3_key": s3_key,
                "expires_in_seconds": expires_in
            }
        except ClientError as e:
            print(f"Error generating presigned upload URL: {e}")
            raise e

    def generate_presigned_read_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """
        Generate a pre-signed URL to allow reading/downloading a file from S3.
        """
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expires_in
            )
            return response
        except ClientError as e:
            print(f"Error generating presigned read URL: {e}")
            raise e

s3_service = S3Service()
