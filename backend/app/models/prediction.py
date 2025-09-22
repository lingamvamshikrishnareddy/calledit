# app/models/prediction.py - FIXED: Remove duplicate Category definition
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid
import enum

# Import Category from its own module
from .category import Category

class PredictionStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed" 
    RESOLVED = "resolved"
    CANCELLED = "cancelled"

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Foreign keys
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Prediction state
    status = Column(String(20), default=PredictionStatus.ACTIVE.value)
    
    # Vote counts
    yes_votes = Column(Integer, default=0)
    no_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    
    # Resolution
    resolution = Column(Boolean, nullable=True)
    resolution_notes = Column(Text)
    
    # Points system
    points_pool = Column(Integer, default=100)
    base_points = Column(Integer, default=10)
    points_awarded = Column(Integer, default=0)
    
    # Timestamps
    closes_at = Column(DateTime(timezone=True), nullable=False)
    expected_resolution = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="predictions")
    creator = relationship("User", back_populates="predictions")
    votes = relationship("Vote", back_populates="prediction", cascade="all, delete-orphan")
    points_transactions = relationship("PointsTransaction", back_populates="prediction", cascade="all, delete-orphan")
    
    @property
    def is_active(self):
        return self.status == PredictionStatus.ACTIVE.value
    
    @property
    def is_resolved(self):
        return self.status == PredictionStatus.RESOLVED.value