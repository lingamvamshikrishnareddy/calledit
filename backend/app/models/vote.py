# app/models/vote.py
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(String, ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False)
    
    # Vote details
    vote = Column(Boolean, nullable=False)  # True = Yes, False = No
    confidence = Column(Integer, nullable=False, default=50)  # 1-100 confidence level
    
    # Points system
    points_staked = Column(Integer, default=10)  # Points user stakes on this vote
    points_earned = Column(Integer, default=0)   # Points earned when resolved
    multiplier = Column(Integer, default=1)      # Point multiplier based on confidence/timing
    
    # Vote timing (for potential bonuses)
    vote_position = Column(Integer)  # What number vote this was (1st, 2nd, etc.)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="votes")
    prediction = relationship("Prediction", back_populates="votes")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_votes_user_id', 'user_id'),
        Index('idx_votes_prediction_id', 'prediction_id'),
        Index('idx_votes_user_prediction', 'user_id', 'prediction_id', unique=True),  # One vote per user per prediction
        Index('idx_votes_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Vote(id={self.id}, user_id={self.user_id}, prediction_id={self.prediction_id}, vote={self.vote}, confidence={self.confidence})>"
    
    @property
    def vote_text(self):
        """Human readable vote"""
        return "Yes" if self.vote else "No"
    
    @property
    def confidence_level(self):
        """Confidence level as text"""
        if self.confidence >= 80:
            return "Very High"
        elif self.confidence >= 60:
            return "High"
        elif self.confidence >= 40:
            return "Medium"
        elif self.confidence >= 20:
            return "Low"
        else:
            return "Very Low"