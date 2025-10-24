# app/models/prediction.py - UPDATED with resolution fields
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid
from datetime import datetime, timezone
from enum import Enum

class PredictionStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Creator
    created_by = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Category
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    
    # Status
    status = Column(String(20), default=PredictionStatus.ACTIVE.value)
    
    # Vote counts
    yes_votes = Column(Integer, default=0)
    no_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    
    # Points
    points_awarded = Column(Integer, default=100)
    
    # Timing
    closes_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # ADDED: Resolution fields
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution = Column(Boolean, nullable=True)  # True = YES won, False = NO won, None = unresolved
    resolution_notes = Column(Text, nullable=True)  # Optional notes from resolver
    
    # Relationships
    creator = relationship("User", back_populates="predictions")
    category = relationship("Category", back_populates="predictions")
    votes = relationship("Vote", back_populates="prediction", cascade="all, delete-orphan")
    points_transactions = relationship("PointsTransaction", back_populates="prediction")
    
    # Indexes
    __table_args__ = (
        Index('idx_predictions_status', 'status'),
        Index('idx_predictions_creator', 'created_by'),
        Index('idx_predictions_category', 'category_id'),
        Index('idx_predictions_closes_at', 'closes_at'),
        Index('idx_predictions_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Prediction(title={self.title}, status={self.status})>"
    
    def is_active(self) -> bool:
        """Check if prediction is currently accepting votes"""
        if self.status != PredictionStatus.ACTIVE.value:
            return False
        
        if self.closes_at:
            now = datetime.now(timezone.utc)
            closes_at = self.closes_at
            if closes_at.tzinfo is None:
                closes_at = closes_at.replace(tzinfo=timezone.utc)
            else:
                closes_at = closes_at.astimezone(timezone.utc)
            
            return closes_at > now
        
        return True
    
    def close(self):
        """Close prediction to new votes"""
        if self.status == PredictionStatus.ACTIVE.value:
            self.status = PredictionStatus.CLOSED.value
            self.updated_at = datetime.now(timezone.utc)
    
    def resolve(self, resolution: bool, notes: str = None):
        """
        Resolve the prediction
        
        Args:
            resolution: True if YES wins, False if NO wins
            notes: Optional resolution notes
        """
        self.status = PredictionStatus.RESOLVED.value
        self.resolution = resolution
        self.resolved_at = datetime.now(timezone.utc)
        self.resolution_notes = notes
        self.updated_at = datetime.now(timezone.utc)
    
    def cancel(self, reason: str = None):
        """Cancel the prediction"""
        self.status = PredictionStatus.CANCELLED.value
        if reason:
            self.resolution_notes = f"Cancelled: {reason}"
        self.updated_at = datetime.now(timezone.utc)
    
    def to_dict(self, include_user_vote=None):
        """Convert prediction to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'yes_votes': self.yes_votes,
            'no_votes': self.no_votes,
            'total_votes': self.total_votes,
            'points_awarded': self.points_awarded,
            'closes_at': self.closes_at.isoformat() if self.closes_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution': self.resolution,
            'resolution_notes': self.resolution_notes,
            'creator': {
                'id': self.creator.id,
                'username': self.creator.username,
                'display_name': self.creator.display_name
            } if self.creator else None,
            'category': {
                'id': self.category.id,
                'name': self.category.name,
                'slug': self.category.slug
            } if self.category else None,
            'user_vote': include_user_vote
        }