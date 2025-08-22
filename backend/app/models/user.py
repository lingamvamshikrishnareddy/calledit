# app/models/user.py - Fixed User Model (String ID instead of UUID)
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    # FIXED: Use String instead of UUID type to avoid PostgreSQL comparison issues
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Profile information
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Gaming/Points system
    total_points = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    
    # Prediction statistics
    predictions_made = Column(Integer, default=0)
    predictions_correct = Column(Integer, default=0)
    accuracy_rate = Column(Float, default=0.0)
    
    # User progression
    level = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships (ensure these models exist)
    predictions = relationship("Prediction", back_populates="creator", lazy="dynamic")
    votes = relationship("Vote", back_populates="user", lazy="dynamic")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"
    
    @property
    def accuracy_percentage(self):
        """Calculate accuracy as percentage"""
        if self.predictions_made == 0:
            return 0.0
        return round((self.predictions_correct / self.predictions_made) * 100, 2)