# app/controllers/auth_controller.py - Fixed Auth Controller
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import uuid
from datetime import datetime

from ..models.user import User
from ..utils.password_utils import PasswordUtils
from ..config.jwt_config import jwt_config

class AuthController:
    def __init__(self, db: Session):
        self.db = db
        self.password_utils = PasswordUtils()
    
    def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create a new user in the database"""
        # Hash the password
        hashed_password = self.password_utils.hash_password(user_data['password'])
        
        # Create user instance
        user = User(
            id=uuid.uuid4(),
            username=user_data['username'],
            display_name=user_data['display_name'],
            email=user_data['email'],
            password_hash=hashed_password,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            # Handle both string and UUID formats
            if isinstance(user_id, str):
                return self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()
            else:
                return self.db.query(User).filter(User.id == user_id).first()
        except (ValueError, TypeError) as e:
            print(f"Error getting user by ID: {e}")
            return None
    
    def verify_password(self, user: User, password: str) -> bool:
        """Verify user password"""
        if not hasattr(user, 'password_hash') or not user.password_hash:
            return False
        return self.password_utils.verify_password(password, user.password_hash)
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = self.get_user_by_username(username)
        if not user:
            return None
        
        if not self.verify_password(user, password):
            return None
        
        return user
    
    def create_tokens(self, user: User) -> Dict[str, str]:
        """Create access and refresh tokens for user"""
        user_data = {
            "sub": str(user.id),
            "email": user.email,
            "username": user.username
        }
        
        access_token = jwt_config.create_access_token(user_data)
        refresh_token = jwt_config.create_refresh_token(user_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    def get_user_from_token(self, token: str) -> Optional[User]:
        """Get user from JWT token"""
        try:
            payload = jwt_config.verify_access_token(token)
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            return self.get_user_by_id(user_id)
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """Create new access token from refresh token"""
        try:
            payload = jwt_config.verify_refresh_token(refresh_token)
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            user = self.get_user_by_id(user_id)
            if not user:
                return None
            
            # Create new tokens
            return self.create_tokens(user)
            
        except Exception as e:
            print(f"Token refresh error: {e}")
            return None
    
    def check_username_exists(self, username: str) -> bool:
        """Check if username already exists"""
        return self.db.query(User).filter(User.username == username).first() is not None
    
    def check_email_exists(self, email: str) -> bool:
        """Check if email already exists"""
        return self.db.query(User).filter(User.email == email).first() is not None
    
    def update_user_profile(self, user_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update user profile"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Update allowed fields
        allowed_fields = ['display_name', 'avatar_url', 'bio']
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def search_users(self, query: str, limit: int = 20) -> list[User]:
        """Search users by username or display name"""
        search_pattern = f"%{query}%"
        return (self.db.query(User)
                .filter(
                    (User.username.ilike(search_pattern)) |
                    (User.display_name.ilike(search_pattern))
                )
                .filter(User.is_active == True)
                .limit(limit)
                .all())