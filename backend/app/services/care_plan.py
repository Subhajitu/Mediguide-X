import json
import re
from typing import Dict, Any
from app.services.bedrock import bedrock_service
from app.schemas.care_plan import CarePlanSchema

class CarePlanService:
    def _parse_json_from_response(self, text: str) -> Dict[str, Any]:
        """Extracts JSON from markdown fences if present."""
        try:
            match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}\nRaw text: {text}")
            raise ValueError("Failed to parse AI output into JSON")

    async def generate_care_plan(self, patient_context: str, transcript: str) -> CarePlanSchema:
        """
        Invokes Nova Pro to analyze the patient context and conversation transcript,
        and generate a structured Care Plan.
        """
        system_prompt = (
            "You are an expert AI medical assistant generating a Care Plan summary. "
            "Follow this Chain-of-Thought reasoning:\n"
            "Step 1: Review Patient Context (age, gender, existing conditions, active medications).\n"
            "Step 2: Evaluate Chief Complaint / User Prompt against clinical knowledge from the transcript.\n"
            "Step 3: Identify potential red flag symptoms requiring immediate emergency care.\n"
            "Step 4: Formulate conservative home care guidance and questions for clinician review.\n"
            "Step 5: Output structured response adhering strictly to requested JSON schema.\n\n"
            "You MUST respond ONLY with a valid JSON object matching this schema: \n"
            "{\n"
            '  "symptom_summary": "Summary of presented symptoms",\n'
            '  "possible_causes": ["Cause 1", "Cause 2"],\n'
            '  "recommended_actions": ["Action 1", "Action 2"],\n'
            '  "red_flags": ["Red flag 1", "Red flag 2"],\n'
            '  "questions_for_doctor": ["Question 1", "Question 2"],\n'
            '  "disclaimer": "Disclaimer: Mediguide X provides AI-generated informational guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns."\n'
            "}\n"
            "Do not include any explanation or conversational text outside of the JSON block."
        )

        prompt_content = f"{patient_context}\n\n[CONSULTATION TRANSCRIPT]\n{transcript}"
        messages = [{"role": "user", "content": [{"text": prompt_content}]}]

        response = await bedrock_service.invoke_nova_pro(messages, system_prompt, temperature=0.1)
        ai_text = response["output"]["message"]["content"][0]["text"]
        
        # Parse JSON and validate with Pydantic
        extracted_data = self._parse_json_from_response(ai_text)
        return CarePlanSchema(**extracted_data)

care_plan_service = CarePlanService()
