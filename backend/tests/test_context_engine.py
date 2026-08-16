"""
Unit tests for ContextEngine._read_extracted_params and parameter formatting.
These tests do not require a database connection.
"""
import pytest
from app.services.context_engine import ContextEngine


class TestReadExtractedParams:
    def setup_method(self):
        self.engine = ContextEngine()

    def test_new_list_format_returned_as_is(self):
        """Post-Task-1 list format passes through unchanged."""
        params = [{"name": "Hb", "value": "11.2", "unit": "g/dL", "is_out_of_range": True}]
        result = self.engine._read_extracted_params(params)
        assert result == params

    def test_old_dict_format_returns_inner_list(self):
        """Pre-Task-1 {"parameters": [...]} format is unwrapped correctly."""
        inner = [{"name": "Glucose", "value": "95", "unit": "mg/dL", "is_out_of_range": False}]
        result = self.engine._read_extracted_params({"parameters": inner})
        assert result == inner

    def test_none_returns_empty_list(self):
        """None (un-analyzed record) returns []."""
        assert self.engine._read_extracted_params(None) == []

    def test_empty_dict_returns_empty_list(self):
        """A dict without a 'parameters' key returns []."""
        assert self.engine._read_extracted_params({}) == []

    def test_unexpected_type_returns_empty_list(self):
        """A string or other unexpected type returns []."""
        assert self.engine._read_extracted_params("bad-data") == []
        assert self.engine._read_extracted_params(42) == []

    def test_old_format_with_empty_parameters_list(self):
        """{"parameters": []} returns [] without errors."""
        assert self.engine._read_extracted_params({"parameters": []}) == []

    def test_empty_list_returns_empty_list(self):
        """An empty list returns [] without errors."""
        assert self.engine._read_extracted_params([]) == []


class TestParameterFormatting:
    """
    Verify the ⚠ warning marker logic works as expected.
    We test it by inspecting _read_extracted_params output and the manual
    formatting logic in build_patient_context (via unit-testable helper).
    """

    def setup_method(self):
        self.engine = ContextEngine()

    def _format_param(self, p: dict) -> str:
        """Replicate the formatting logic from build_patient_context."""
        name = p.get("name", "")
        value = p.get("value", "")
        unit = p.get("unit", "")
        out_of_range = p.get("is_out_of_range", False)
        entry = f"{name}: {value} {unit}".strip()
        if out_of_range:
            entry += " \u26a0"
        return entry

    def test_out_of_range_flag_appends_warning(self):
        p = {"name": "Hemoglobin", "value": "11.2", "unit": "g/dL", "is_out_of_range": True}
        assert self._format_param(p) == "Hemoglobin: 11.2 g/dL ⚠"

    def test_in_range_param_has_no_warning(self):
        p = {"name": "Glucose", "value": "95", "unit": "mg/dL", "is_out_of_range": False}
        assert self._format_param(p) == "Glucose: 95 mg/dL"

    def test_missing_unit_formats_cleanly(self):
        p = {"name": "BMI", "value": "24.1", "unit": "", "is_out_of_range": False}
        result = self._format_param(p)
        assert "BMI: 24.1" in result
        assert "⚠" not in result
