import boto3
import json
from app.core.config import settings

class BedrockService:
    def __init__(self):
        self.bedrock_runtime = boto3.client(
            service_name='bedrock-runtime',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.model_id_lite = "amazon.nova-lite-v1:0"

    def get_system_prompt(self) -> str:
        return (
            "You are Mediguide X, an empathetic AI healthcare assistant for Indian patients. "
            "Use patient context and general medical knowledge to provide clear explanations. "
            "Recommend when to consult a doctor. Do NOT provide a final medical diagnosis."
        )

    async def invoke_nova_lite_chat(self, patient_context: str, user_message: str) -> str:
        """
        Sends the compressed patient context and the latest user message to Amazon Nova Lite.
        """
        # Amazon Nova Converse API Format
        system = [{"text": self.get_system_prompt()}]
        
        # Combine the context and the user message to ensure the model sees both.
        # The context can also be provided as part of the system prompt or user prompt.
        prompt_content = f"{patient_context}\n\n[USER INQUIRY]\n{user_message}"
        
        messages = [
            {
                "role": "user",
                "content": [{"text": prompt_content}]
            }
        ]

        inference_config = {
            "temperature": 0.3,
            "maxTokens": 1024,
            "topP": 0.9
        }

        try:
            # Note: We are using synchronous boto3 in an async function. 
            # In a production FastAPI app, this should ideally be run in a ThreadPoolExecutor 
            # or using aiobotocore to avoid blocking the event loop.
            import asyncio
            loop = asyncio.get_event_loop()
            
            def _invoke():
                return self.bedrock_runtime.converse(
                    modelId=self.model_id_lite,
                    messages=messages,
                    system=system,
                    inferenceConfig=inference_config
                )
                
            response = await loop.run_in_executor(None, _invoke)
            
            # Extract response text
            ai_text = response["output"]["message"]["content"][0]["text"]
            return ai_text

        except Exception as e:
            print(f"Error invoking Bedrock Nova Lite: {e}")
            raise e

bedrock_service = BedrockService()
