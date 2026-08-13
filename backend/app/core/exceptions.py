from fastapi import HTTPException

class AuthException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=401, detail=detail)

class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)

class BadRequestException(HTTPException):
    def __init__(self, detail: str = "Bad Request"):
        super().__init__(status_code=400, detail=detail)
