# app/routers/auth.py - FIXED: Correct prefix and enhanced error handling
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
import re
import traceback
from datetime import datetime
from ..database.connection import get_db
from ..services.auth_service import AuthService

# FIXED: Correct single /api/auth prefix
router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    display_name: str = Field(..., min_length=1, max_length=100, description="Display name")
    email: str = Field(..., min_length=5, max_length=255, description="Email address")
    password: str = Field(..., min_length=6, max_length=100, description="Password")

    @validator('email')
    def validate_email(cls, v):
        if not v:
            raise ValueError('Email is required')
        if not EMAIL_REGEX.match(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

    @validator('username')
    def validate_username(cls, v):
        if not v:
            raise ValueError('Username is required')
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        return v

    @validator('display_name')
    def validate_display_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Display name is required')
        return v.strip()

    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password is required')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=100, description="Username")
    password: str = Field(..., min_length=1, max_length=100, description="Password")

    @validator('username')
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError('Username is required')
        return v.strip().lower()

    @validator('password')  
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password is required')
        return v

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class UserProfile(BaseModel):
    id: str
    username: str
    display_name: str
    email: str
    avatar_url: str = None
    bio: str = None
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    predictions_made: int = 0
    predictions_correct: int = 0
    accuracy_rate: float = 0.0
    level: int = 1
    created_at: str = None
    updated_at: str = None

def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate token from Authorization header"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token.strip()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user and return access tokens"""
    try:
        print(f"📝 Registration attempt for: {user_data.username}")
        print(f"📧 Email: {user_data.email}")
        
        auth_service = AuthService(db)
        result = auth_service.register_user(user_data.dict())
        
        print(f"✅ Registration successful for: {user_data.username}")
        return result
        
    except ValueError as e:
        error_msg = str(e)
        print(f"❌ Registration validation error: {error_msg}")
        
        # Map specific errors to appropriate status codes
        if "already registered" in error_msg.lower():
            raise HTTPException(status_code=409, detail=error_msg)
        elif "already taken" in error_msg.lower():
            raise HTTPException(status_code=409, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)
            
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"💥 Registration system error: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail="Registration failed due to server error"
        )

@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access tokens"""
    try:
        print(f"🔐 Login attempt for: {user_data.username}")
        
        auth_service = AuthService(db)
        result = auth_service.authenticate_user(user_data.username, user_data.password)
        
        print(f"✅ Login successful for: {user_data.username}")
        return result
        
    except ValueError as e:
        error_msg = str(e)
        print(f"❌ Login authentication error: {error_msg}")
        raise HTTPException(
            status_code=401, 
            detail=error_msg,
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"💥 Login system error: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail="Login failed due to server error"
        )

@router.get("/me", response_model=UserProfile)
def get_current_user(
    token: str = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Get current authenticated user profile"""
    try:
        print(f"👤 Getting current user profile...")
        
        auth_service = AuthService(db)
        user = auth_service.get_current_user(token)
        
        user_profile = UserProfile(
            id=str(user.id),
            username=user.username,
            display_name=user.display_name,
            email=user.email,
            avatar_url=user.avatar_url,
            bio=user.bio,
            total_points=user.total_points,
            current_streak=user.current_streak,
            longest_streak=user.longest_streak,
            predictions_made=user.predictions_made,
            predictions_correct=user.predictions_correct,
            accuracy_rate=float(user.accuracy_rate) if user.accuracy_rate else 0.0,
            level=user.level,
            created_at=user.created_at.isoformat() if user.created_at else None,
            updated_at=user.updated_at.isoformat() if user.updated_at else None
        )
        
        print(f"✅ User profile retrieved: {user.username}")
        return user_profile
        
    except ValueError as e:
        error_msg = str(e)
        print(f"❌ Token validation error: {error_msg}")
        raise HTTPException(
            status_code=401, 
            detail=error_msg,
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"💥 Get user profile error: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user profile"
        )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        print(f"🔄 Token refresh attempt...")
        
        auth_service = AuthService(db)
        result = auth_service.refresh_token(refresh_data.refresh_token)
        
        print(f"✅ Token refresh successful")
        return result
        
    except ValueError as e:
        error_msg = str(e)
        print(f"❌ Token refresh error: {error_msg}")
        raise HTTPException(
            status_code=401, 
            detail=error_msg,
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"💥 Token refresh system error: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail="Token refresh failed"
        )

@router.post("/logout")
def logout(
    token: str = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Logout user (invalidate tokens)"""
    try:
        print(f"👋 Logout request received")
        
        # For now, logout is mainly handled client-side by removing tokens
        # In future, we could maintain a token blacklist
        
        print(f"✅ Logout successful")
        return {
            "message": "Logged out successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"⚠️ Logout error (non-critical): {e}")
        # Don't fail logout even if there's an error
        return {
            "message": "Logged out successfully",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/health")
def health_check():
    """Health check endpoint for auth service"""
    print("🏥 Auth service health check")
    return {
        "status": "healthy",
        "service": "auth",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "register": "POST /api/auth/register",
            "login": "POST /api/auth/login", 
            "me": "GET /api/auth/me",
            "refresh": "POST /api/auth/refresh",
            "logout": "POST /api/auth/logout"
        }
    }

# Optional: Test endpoint for development
@router.get("/test")
def test_endpoint():
    """Test endpoint to verify auth router is working"""
    return {
        "message": "Auth router is working!",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "development" if __debug__ else "production"
    }