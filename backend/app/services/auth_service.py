# app/services/auth_service.py - Fixed Auth Service
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from ..controllers.auth_controller import AuthController

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.auth_controller = AuthController(db)

    def register_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new user - SYNCHRONOUS"""
        # Validate unique constraints
        if self.auth_controller.check_email_exists(user_data['email']):
            raise ValueError("Email already registered")
        
        if self.auth_controller.check_username_exists(user_data['username']):
            raise ValueError("Username already taken")
        
        # Create user
        user = self.auth_controller.create_user(user_data)
        
        # Generate tokens
        tokens = self.auth_controller.create_tokens(user)
        
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"],
            "user": {
                "id": str(user.id),
                "username": user.username,
                "display_name": user.display_name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "total_points": user.total_points,
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "predictions_made": user.predictions_made,
                "predictions_correct": user.predictions_correct,
                "accuracy_rate": float(user.accuracy_rate) if user.accuracy_rate else 0.0,
                "level": user.level
            }
        }

    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return tokens - SYNCHRONOUS"""
        user = self.auth_controller.authenticate_user(username, password)
        if not user:
            raise ValueError("Invalid username or password")
        
        # Generate tokens
        tokens = self.auth_controller.create_tokens(user)
        
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"],
            "user": {
                "id": str(user.id),
                "username": user.username,
                "display_name": user.display_name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "total_points": user.total_points,
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "predictions_made": user.predictions_made,
                "predictions_correct": user.predictions_correct,
                "accuracy_rate": float(user.accuracy_rate) if user.accuracy_rate else 0.0,
                "level": user.level
            }
        }

    def get_current_user(self, token: str):
        """Get current user from JWT token - SYNCHRONOUS"""
        user = self.auth_controller.get_user_from_token(token)
        if not user:
            raise ValueError("Invalid or expired token")
        return user

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token - SYNCHRONOUS"""
        tokens = self.auth_controller.refresh_access_token(refresh_token)
        if not tokens:
            raise ValueError("Invalid or expired refresh token")
        
        # Get user data for the refreshed token
        try:
            user = self.auth_controller.get_user_from_token(tokens["access_token"])
            return {
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "token_type": tokens["token_type"],
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "display_name": user.display_name,
                    "email": user.email,
                    "avatar_url": user.avatar_url,
                    "bio": user.bio,
                    "total_points": user.total_points,
                    "current_streak": user.current_streak,
                    "longest_streak": user.longest_streak,
                    "predictions_made": user.predictions_made,
                    "predictions_correct": user.predictions_correct,
                    "accuracy_rate": float(user.accuracy_rate) if user.accuracy_rate else 0.0,
                    "level": user.level
                }
            }
        except Exception:
            # Return tokens without user data if user fetch fails
            return tokens

    def update_user_profile(self, user_id: str, update_data: Dict[str, Any]):
        """Update user profile - SYNCHRONOUS"""
        user = self.auth_controller.update_user_profile(user_id, update_data)
        if not user:
            raise ValueError("User not found")
        return user

    def get_user_by_id(self, user_id: str):
        """Get user by ID - SYNCHRONOUS"""
        return self.auth_controller.get_user_by_id(user_id)

    def search_users(self, query: str, limit: int = 20):
        """Search users - SYNCHRONOUS"""
        return self.auth_controller.search_users(query, limit)