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
        self.model_id_pro = "amazon.nova-pro-v1:0"

    def get_system_prompt(self) -> str:
        return (
            "You are Mediguide X, an empathetic, highly professional AI healthcare assistant for patients. "
            "Your sole purpose is to discuss medical, health, and wellness topics. "
            "\n\nSTRICT GUARDRAILS:\n"
            "1. You MUST politely decline to answer ANY questions that are not related to health, medicine, or wellness. If a user asks about programming, politics, general knowledge, or other off-topic subjects, reply: 'I am Mediguide X, a healthcare assistant. I can only assist you with medical and health-related inquiries.'\n"
            "2. Do NOT provide a final, definitive medical diagnosis. Always recommend when a patient should physically consult a doctor.\n"
            "3. Do NOT prescribe specific dosages for prescription medications unless confirming what is already in their medical records.\n\n"
            "RESPONSE FORMATTING:\n"
            "- Always use clean Markdown formatting.\n"
            "- Use **bold text** for key medical terms, conditions, or medications.\n"
            "- Use bullet points or numbered lists to break down complex explanations, steps, or symptoms.\n"
            "- Keep your tone professional, empathetic, and concise. Avoid giant walls of text."
        )

    def _execute_converse(self, model_id: str, messages: list, system: list, temperature: float = 0.3, max_tokens: int = 1024, tool_config: dict = None) -> dict:
        inference_config = {
            "temperature": temperature,
            "maxTokens": max_tokens,
            "topP": 0.9
        }
        kwargs = {
            "modelId": model_id,
            "messages": messages,
            "system": system,
            "inferenceConfig": inference_config
        }
        if tool_config:
            kwargs["toolConfig"] = tool_config
            
        return self.bedrock_runtime.converse(**kwargs)

    async def invoke_nova_lite_chat(self, patient_context: str, user_message: str) -> str:
        """
        Sends the compressed patient context and the latest user message to Amazon Nova Lite.
        """
        system = [{"text": self.get_system_prompt()}]
        prompt_content = f"{patient_context}\n\n[USER INQUIRY]\n{user_message}"
        messages = [{"role": "user", "content": [{"text": prompt_content}]}]

        import asyncio
        loop = asyncio.get_event_loop()
        try:
            response = await loop.run_in_executor(None, self._execute_converse, self.model_id_lite, messages, system)
            return response["output"]["message"]["content"][0]["text"]
        except Exception as e:
            print(f"Error invoking Bedrock Nova Lite: {e}")
            raise e

    async def invoke_nova_pro(self, messages: list, system_prompt: str, tool_config: dict = None, temperature: float = 0.1) -> dict:
        """
        Executes complex reasoning or multimodal tasks using Amazon Nova Pro.
        Allows passing raw messages (which can contain images/documents) and tool configurations for structured JSON output.
        """
        system = [{"text": system_prompt}]
        
        import asyncio
        loop = asyncio.get_event_loop()
        try:
            # For complex tasks like data extraction, we use lower temperature (0.1) and higher maxTokens (2048)
            response = await loop.run_in_executor(None, self._execute_converse, self.model_id_pro, messages, system, temperature, 2048, tool_config)
            return response
        except Exception as e:
            print(f"Error invoking Bedrock Nova Pro: {e}")
            raise e

bedrock_service = BedrockService()
