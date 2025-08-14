# app/controllers/user_controller.py - Missing controller
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from ..models.user import User

class UserController:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def update_user_stats(self, user_id: str, stats_update: dict) -> Optional[User]:
        """Update user statistics"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        for field, value in stats_update.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        self.db.commit()
        self.db.refresh(user)
        return user