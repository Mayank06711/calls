"""
Security middleware for validating requests from Node.js server.
"""
from fastapi import Request, HTTPException, status
from config import settings


async def validate_internal_request(request: Request):
    """
    Middleware to validate that request comes from our Node.js server.
    
    Security checks:
    1. Verify X-Internal-Service-Key header matches shared secret
    2. Optionally check Origin/Referer header (commented out - can enable for stricter security)
    
    Args:
        request: FastAPI Request object
    
    Raises:
        HTTPException 401: If validation fails
    """
    # Check for internal service key header
    service_key = request.headers.get("X-Internal-Service-Key")
    
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Internal-Service-Key header"
        )
    
    if service_key != settings.INTERNAL_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service key"
        )
    
    # Optional: Validate request origin (uncomment for stricter security)
    # origin = request.headers.get("Origin") or request.headers.get("Referer", "")
    # if not origin.startswith(settings.SERVER_BASE_URL):
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Request must originate from authorized server"
    #     )
    
    return True
