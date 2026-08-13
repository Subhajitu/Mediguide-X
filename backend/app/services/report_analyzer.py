import boto3
import json
import re
from typing import Dict, Any
from app.core.config import settings
from app.services.bedrock import bedrock_service

class ReportAnalyzerService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.bucket_name = settings.AWS_S3_BUCKET_NAME

    def _get_file_bytes_from_s3(self, s3_key: str) -> bytes:
        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
        return response['Body'].read()

    def _build_multimodal_message(self, file_bytes: bytes, filename: str) -> list:
        """
        Builds the Converse API message payload for an image or document.
        """
        extension = filename.split('.')[-1].lower()
        if extension in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            if extension == 'jpg':
                extension = 'jpeg'
            content = {
                "image": {
                    "format": extension,
                    "source": {"bytes": file_bytes}
                }
            }
        elif extension in ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'txt', 'md']:
            content = {
                "document": {
                    "format": extension,
                    "name": "medical_report",
                    "source": {"bytes": file_bytes}
                }
            }
        else:
            raise ValueError(f"Unsupported file format for Nova Pro: {extension}")

        messages = [
            {
                "role": "user",
                "content": [
                    content,
                    {
                        "text": "Analyze this uploaded medical lab report image/document. Extract all lab parameters into a structured JSON dictionary. For each parameter include: 'name', 'value', 'unit', 'reference_range', and 'is_out_of_range' (boolean). Also provide a brief 2-sentence layperson summary."
                    }
                ]
            }
        ]
        return messages

    def _parse_json_from_response(self, text: str) -> Dict[str, Any]:
        """Extracts JSON from markdown fences if present."""
        try:
            # Look for JSON block
            match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            # Fallback to just parsing the whole text
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}\nRaw text: {text}")
            return {"summary": "Failed to extract summary.", "extracted_parameters": []}

    async def analyze_report(self, s3_key: str, filename: str) -> Dict[str, Any]:
        """
        Downloads report from S3 and invokes Nova Pro to extract structured data.
        """
        try:
            # 1. Get file from S3
            import asyncio
            loop = asyncio.get_event_loop()
            file_bytes = await loop.run_in_executor(None, self._get_file_bytes_from_s3, s3_key)

            # 2. Build message
            messages = self._build_multimodal_message(file_bytes, filename)

            # 3. Define the strict JSON schema we want
            system_prompt = (
                "You are an expert medical data extractor. Extract the contents of the report. "
                "You MUST respond ONLY with a valid JSON object matching this schema: \n"
                "{\n"
                '  "summary": "2-sentence layperson summary of the report",\n'
                '  "extracted_parameters": [\n'
                '    {\n'
                '      "name": "Parameter Name (e.g. Hemoglobin)",\n'
                '      "value": "Value",\n'
                '      "unit": "Unit (e.g. g/dL) or null",\n'
                '      "reference_range": "Range (e.g. 12.0 - 15.5) or null",\n'
                '      "is_out_of_range": true/false\n'
                '    }\n'
                '  ]\n'
                "}\n"
                "Do not include any explanation or conversational text outside of the JSON block."
            )

            # 4. Invoke Nova Pro
            response = await bedrock_service.invoke_nova_pro(messages, system_prompt, temperature=0.1)
            ai_text = response["output"]["message"]["content"][0]["text"]
            
            # 5. Parse JSON
            extracted_data = self._parse_json_from_response(ai_text)
            return extracted_data
            
        except Exception as e:
            print(f"Error in report analysis: {e}")
            raise e

report_analyzer = ReportAnalyzerService()
