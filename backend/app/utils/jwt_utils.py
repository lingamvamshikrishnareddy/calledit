# app/utils/jwt_utils.py - FIXED: Proper JWT configuration with environment variables
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os

# Load JWT configuration from environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-change-this-in-production")
JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")

# FIXED: Use environment variables for token expiration
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "720"))  # 12 hours for testing
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

print(f"🔧 JWT Config: Access token expires in {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
print(f"🔧 JWT Config: Refresh token expires in {REFRESH_TOKEN_EXPIRE_DAYS} days")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with proper expiration"""
    to_encode = data.copy()
    
    # FIXED: Use environment variable for expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add token metadata
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        print(f"✅ Access token created, expires at: {expire}")
        return encoded_jwt
    except Exception as e:
        print(f"❌ Error creating JWT access token: {str(e)}")
        raise Exception(f"Token creation failed: {str(e)}")

def verify_access_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT access token"""
    try:
        # Decode and verify token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # Check if it's an access token
        if payload.get("type") != "access":
            raise Exception("Invalid token type")
        
        return payload
    except jwt.ExpiredSignatureError:
        print("❌ JWT token has expired")
        raise Exception("Token expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ Token verification failed: {str(e)}")
        raise Exception("Invalid token")
    except Exception as e:
        print(f"❌ JWT verification error: {str(e)}")
        raise Exception("Token verification failed")

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token with longer expiration"""
    to_encode = data.copy()
    
    # FIXED: Use environment variable for refresh token expiration
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Add token metadata
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        print(f"✅ Refresh token created, expires at: {expire}")
        return encoded_jwt
    except Exception as e:
        print(f"❌ Error creating refresh token: {str(e)}")
        raise Exception(f"Refresh token creation failed: {str(e)}")

def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT refresh token"""
    try:
        # Decode and verify token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # Check if this is actually a refresh token
        if payload.get("type") != "refresh":
            raise Exception("Not a refresh token")
        
        return payload
    except jwt.ExpiredSignatureError:
        print("❌ Refresh token has expired")
        raise Exception("Refresh token expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid refresh token: {str(e)}")
        raise Exception("Invalid refresh token")
    except Exception as e:
        print(f"❌ Refresh token verification error: {str(e)}")
        raise Exception("Refresh token verification failed")

def decode_token_without_verification(token: str) -> Dict[str, Any]:
    """Decode token without verification (for debugging)"""
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        print(f"❌ Error decoding token: {str(e)}")
        return {}

def get_token_expiry(token: str) -> Optional[datetime]:
    """Get token expiry time without verification"""
    try:
        payload = decode_token_without_verification(token)
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            return datetime.fromtimestamp(exp_timestamp)
        return None
    except Exception as e:
        print(f"❌ Error getting token expiry: {str(e)}")
        return None

def is_token_expired(token: str) -> bool:
    """Check if token is expired without full verification"""
    try:
        expiry = get_token_expiry(token)
        if expiry:
            return datetime.utcnow() > expiry
        return True
    except Exception:
        return True