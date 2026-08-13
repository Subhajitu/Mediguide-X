from pydantic import BaseModel, Field
from typing import List

class CarePlanSchema(BaseModel):
    symptom_summary: str = Field(..., description="Summary of presented symptoms")
    possible_causes: List[str] = Field(..., min_items=1, description="Differential educational possibilities")
    recommended_actions: List[str] = Field(..., min_items=1, description="Actionable non-diagnostic guidance")
    red_flags: List[str] = Field(..., description="Emergency warning symptoms requiring immediate care")
    questions_for_doctor: List[str] = Field(..., description="Questions patient can ask their physician")
    disclaimer: str
