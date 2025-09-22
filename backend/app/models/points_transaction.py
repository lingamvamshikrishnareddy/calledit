# app/models/points_transaction.py
# ===================================
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid
from enum import Enum

class TransactionType(str, Enum):
    PREDICTION_STAKE = "prediction_stake"
    PREDICTION_WIN = "prediction_win"
    DAILY_BONUS = "daily_bonus"
    SIGNUP_BONUS = "signup_bonus"  # Added for registration
    REFERRAL_BONUS = "referral_bonus"
    ADMIN_ADJUSTMENT = "admin_adjustment"

class PointsTransaction(Base):
    __tablename__ = "points_transactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Transaction details
    transaction_type = Column(String(30), nullable=False)
    amount = Column(Integer, nullable=False)  # Positive = earned, Negative = spent
    balance_after = Column(Integer, nullable=False)
    
    # Related entities
    prediction_id = Column(String, ForeignKey("predictions.id"), nullable=True)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="points_transactions")
    prediction = relationship("Prediction", back_populates="points_transactions")
    
    def __repr__(self):
        return f"<PointsTransaction(user={self.user_id}, amount={self.amount}, type={self.transaction_type})>"
