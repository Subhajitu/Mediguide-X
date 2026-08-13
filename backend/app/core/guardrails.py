import re

class Guardrails:
    # A lightweight set of non-medical keywords to fast-fail on obvious violations
    NON_MEDICAL_KEYWORDS = {
        "python", "javascript", "code", "programming", "html", "css",
        "investment", "crypto", "stock", "trading", "bitcoin",
        "recipe", "cooking", "baking",
        "movie", "review", "video game"
    }

    def is_medical_query(self, user_input: str) -> bool:
        """
        Lightweight filter to check if the user input is clearly non-medical.
        In a production system, this could also call a fast LLM or classifier model.
        For now, we use a heuristic keyword approach.
        """
        lower_input = user_input.lower()
        
        # Check against fast-fail keywords
        # If the input contains a lot of these keywords, it might be non-medical
        # However, someone could say "I get a headache when programming in python".
        # So we only block if it's very blatantly not medical.
        # A simple heuristic: if it has programming keywords and NO medical keywords.
        medical_keywords = {"pain", "ache", "symptom", "doctor", "health", "sick", "ill", "hospital", "medicine", "pill", "fever", "cough", "blood", "report"}
        
        has_non_medical = any(kw in lower_input for kw in self.NON_MEDICAL_KEYWORDS)
        has_medical = any(kw in lower_input for kw in medical_keywords)
        
        # If it has non-medical keywords and zero medical keywords, block it.
        if has_non_medical and not has_medical:
            return False
            
        return True

    def get_redirect_message(self) -> str:
        return "I am Mediguide X, an AI health assistant focused exclusively on medical and wellness guidance. Please ask a health-related question."

guardrails = Guardrails()
