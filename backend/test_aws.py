import asyncio
from app.core.config import settings
import boto3
import urllib.request
import json

def validate_aws():
    print("Testing AWS Configurations...")
    try:
        # Test S3
        print("Testing S3 access...")
        s3 = boto3.client('s3', region_name=settings.AWS_REGION, 
                          aws_access_key_id=settings.AWS_ACCESS_KEY_ID, 
                          aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
        s3.head_bucket(Bucket=settings.AWS_S3_BUCKET_NAME)
        print("✅ S3 Bucket Access Successful")
        
        # Test Bedrock
        print("Testing Bedrock access...")
        bedrock_control = boto3.client('bedrock', region_name=settings.AWS_REGION,
                               aws_access_key_id=settings.AWS_ACCESS_KEY_ID, 
                               aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
        response = bedrock_control.get_foundation_model(modelIdentifier='amazon.nova-lite-v1:0')
        print(f"✅ Bedrock Model Found: {response['modelDetails']['modelId']}")
        
        # Test Cognito (JWKS Public Endpoint)
        print("Testing Cognito configuration...")
        jwks_url = f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        req = urllib.request.urlopen(jwks_url)
        if req.getcode() == 200:
            print(f"✅ Cognito User Pool ID is valid (JWKS endpoint accessible)")
            
        print("\nAll AWS Services Validated Successfully!")
    except Exception as e:
        print(f"\n❌ Validation Failed: {str(e)}")

if __name__ == "__main__":
    validate_aws()
