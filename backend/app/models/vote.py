# app/models/vote.py - FIXED: Timezone handling
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid
from datetime import datetime, timezone

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(String, ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False)
    
    # Core vote data
    vote = Column(Boolean, nullable=False)  # True = Yes, False = No
    confidence = Column(Integer, default=75)  # 1-100 confidence level
    
    # Points tracking
    points_wagered = Column(Integer, default=10)  # Points staked on this vote
    points_spent = Column(Integer, default=10)    # Alias for compatibility
    points_earned = Column(Integer, default=0)    # Points earned when resolved
    
    # Resolution status
    is_resolved = Column(Boolean, default=False)
    is_correct = Column(Boolean, nullable=True)   # Null until resolved
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # FIXED: Timestamps with proper timezone handling
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="votes")
    prediction = relationship("Prediction", back_populates="votes")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint('user_id', 'prediction_id', name='unique_user_prediction_vote'),
        Index('idx_votes_user', 'user_id'),
        Index('idx_votes_prediction', 'prediction_id'),
        Index('idx_votes_created_at', 'created_at'),
        Index('idx_votes_resolved', 'is_resolved'),
    )
    
    def __repr__(self):
        return f"<Vote(user_id={self.user_id}, prediction_id={self.prediction_id}, vote={self.vote})>"
    
    @property
    def voted_at(self):
        """Alias for created_at for compatibility with existing code"""
        return self.created_at
    
    def resolve(self, prediction_resolution: bool) -> int:
        """
        Resolve this vote based on prediction outcome
        Returns points earned
        """
        if self.is_resolved:
            return self.points_earned
        
        self.is_resolved = True
        self.is_correct = (self.vote == prediction_resolution)
        self.resolved_at = datetime.now(timezone.utc)  # FIXED: Use timezone-aware datetime
        
        if self.is_correct:
            # Winner gets double their stake
            stake = self.points_wagered or self.points_spent or 10
            self.points_earned = stake * 2
        else:
            # Loser gets nothing
            self.points_earned = 0
        
        return self.points_earned
    
    def to_dict(self):
        """Convert vote to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'prediction_id': self.prediction_id,
            'vote': self.vote,
            'confidence': self.confidence,
            'points_wagered': self.points_wagered,
            'points_spent': self.points_spent,
            'points_earned': self.points_earned,
            'is_resolved': self.is_resolved,
            'is_correct': self.is_correct,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }