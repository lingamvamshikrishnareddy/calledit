# app/config/jwt_config.py - Fixed JWT Configuration
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from dotenv import load_dotenv

load_dotenv()

class JWTConfig:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-this-in-production")
        self.algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY is required in environment variables")
    
    def create_access_token(self, data: Dict[Any, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, data: Dict[Any, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def decode_token(self, token: str) -> Dict[Any, Any]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
        except Exception as e:
            raise ValueError(f"Token decode error: {str(e)}")
    
    def verify_access_token(self, token: str) -> Dict[Any, Any]:
        """Verify access token and return payload"""
        payload = self.decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        return payload
    
    def verify_refresh_token(self, token: str) -> Dict[Any, Any]:
        """Verify refresh token and return payload"""
        payload = self.decode_token(token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        return payload

# Create global instance
jwt_config = JWTConfig()