# app/models/vote.py - Vote Model (Create this file)
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Index, UniqueConstraint
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
    confidence = Column(Integer, default=5)  # 1-10 confidence level
    points_wagered = Column(Integer, default=10)
    
    # Resolution and rewards
    is_correct = Column(Boolean, nullable=True)  # Set when prediction resolves
    points_earned = Column(Integer, default=0)   # Points earned from this vote
    
    # Timestamps
    voted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="votes")
    prediction = relationship("Prediction", back_populates="votes")
    
    # Indexes and constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'prediction_id', name='unique_user_prediction_vote'),
        Index('idx_votes_user', 'user_id'),
        Index('idx_votes_prediction', 'prediction_id'),
        Index('idx_votes_voted_at', 'voted_at'),
    )
    
    def __repr__(self):
        return f"<Vote(user_id={self.user_id}, prediction_id={self.prediction_id}, vote={self.vote})>"