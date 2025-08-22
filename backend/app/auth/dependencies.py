# app/auth/dependencies.py - FIXED: Create this file for auth dependencies
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.user import User
from ..utils.jwt_utils import verify_access_token

async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token
    """
    if not authorization:
        raise HTTPException(
            status_code=401, 
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split(" ")[1]
    
    try:
        # Verify the JWT token
        payload = verify_access_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        print(f"🔐 Authenticated user: {user.username}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires admin privileges
    """
    if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user