"""
Rate limiter — slowapi (Starlette-compatible wrapper around the limits library).

Rate limit key is the authenticated user's DB UUID, injected into
request.state.user_id by get_current_user in security.py.

This prevents one user from burning another user's quota and ensures cost
exposure is tracked per-user rather than per-IP.

Usage in endpoints:
    from app.core.limiter import limiter

    @router.post("/path")
    @limiter.limit("10/minute")
    async def my_endpoint(request: Request, ...):
        ...

The `request: Request` parameter MUST be the first positional parameter in
the endpoint signature for slowapi to extract the key. FastAPI injects it
automatically when declared.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address


def _get_user_id_key(request) -> str:
    """
    Return the authenticated user's DB UUID from request.state.

    Falls back to remote IP address for unauthenticated requests (health
    checks, pre-flight OPTIONS) so the limiter never errors on those paths.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return str(user_id)
    return get_remote_address(request)


limiter = Limiter(key_func=_get_user_id_key)
