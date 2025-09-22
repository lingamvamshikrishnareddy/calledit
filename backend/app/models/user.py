# app/models/user.py - Complete User Model with Daily Bonus Method
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import uuid
from ..database.connection import Base

class User(Base):
    __tablename__ = "users"
    
    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Authentication fields
    username = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Profile fields
    avatar_url = Column(String(500), nullable=True)
    bio = Column(String(500), nullable=True)
    
    # Points and statistics
    total_points = Column(Integer, default=100)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    predictions_made = Column(Integer, default=0)
    predictions_correct = Column(Integer, default=0)
    accuracy_rate = Column(Numeric(5, 2), default=0.00)
    level = Column(Integer, default=1)
    
    # Additional statistics fields
    total_staked = Column(Integer, default=0)
    total_won = Column(Integer, default=0)
    referral_points_earned = Column(Integer, default=0)
    
    # Timestamps
    daily_bonus_claimed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    predictions = relationship("Prediction", back_populates="creator", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    points_transactions = relationship("PointsTransaction", back_populates="user", cascade="all, delete-orphan")
    leaderboard_entries = relationship("LeaderboardEntry", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.username}>"
    
    def can_claim_daily_bonus(self) -> bool:
        """Check if user can claim daily bonus (24-hour cooldown)"""
        if not self.daily_bonus_claimed_at:
            return True
        
        # Remove timezone info for comparison if present
        last_claim = self.daily_bonus_claimed_at
        if hasattr(last_claim, 'replace'):
            last_claim = last_claim.replace(tzinfo=None)
        
        time_since_last_claim = datetime.utcnow() - last_claim
        return time_since_last_claim >= timedelta(hours=24)
    
    def get_time_until_next_bonus(self) -> timedelta:
        """Get time remaining until next bonus can be claimed"""
        if not self.daily_bonus_claimed_at:
            return timedelta(0)
        
        last_claim = self.daily_bonus_claimed_at
        if hasattr(last_claim, 'replace'):
            last_claim = last_claim.replace(tzinfo=None)
        
        time_since_last = datetime.utcnow() - last_claim
        cooldown_period = timedelta(hours=24)
        
        if time_since_last >= cooldown_period:
            return timedelta(0)
        
        return cooldown_period - time_since_last
    
    def to_dict(self):
        """Convert user to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "username": self.username,
            "display_name": self.display_name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "total_points": self.total_points,
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
            "predictions_made": self.predictions_made,
            "predictions_correct": self.predictions_correct,
            "accuracy_rate": float(self.accuracy_rate) if self.accuracy_rate else 0.0,
            "level": self.level,
            "total_staked": self.total_staked,
            "total_won": self.total_won,
            "referral_points_earned": self.referral_points_earned,
            "daily_bonus_claimed_at": self.daily_bonus_claimed_at.isoformat() if self.daily_bonus_claimed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active,
            "can_claim_daily_bonus": self.can_claim_daily_bonus()
        }