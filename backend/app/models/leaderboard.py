# app/models/leaderboard.py - Updated with relationships
# ===================================
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index, DECIMAL, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid
import enum

class LeaderboardPeriod(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ALL_TIME = "all_time"

class LeaderboardType(str, enum.Enum):
    POINTS = "points"
    ACCURACY = "accuracy"
    STREAK = "streak"
    VOLUME = "volume"

class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Leaderboard configuration
    period = Column(String(20), nullable=False)
    leaderboard_type = Column(String(20), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    
    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Rankings and stats
    rank = Column(Integer, nullable=False)
    previous_rank = Column(Integer)
    
    # Core metrics
    points = Column(Integer, default=0)
    predictions_made = Column(Integer, default=0)
    predictions_correct = Column(Integer, default=0)
    accuracy_rate = Column(DECIMAL(5, 2), default=0.00)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    
    # Advanced metrics
    total_confidence = Column(Integer, default=0)
    avg_confidence = Column(DECIMAL(5, 2), default=0.00)
    early_bird_bonus = Column(Integer, default=0)
    
    # Timestamps
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="leaderboard_entries")
    category = relationship("Category", back_populates="leaderboard_entries", foreign_keys=[category_id])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_leaderboard_period_type', 'period', 'leaderboard_type'),
        Index('idx_leaderboard_user', 'user_id'),
        Index('idx_leaderboard_rank', 'rank'),
        Index('idx_leaderboard_category', 'category_id'),
        Index('idx_leaderboard_period_range', 'period_start', 'period_end'),
        Index('idx_leaderboard_unique_entry', 'user_id', 'period', 'leaderboard_type', 'category_id', 'period_start', unique=True),
    )
    
    def __repr__(self):
        return f"<LeaderboardEntry(user_id={self.user_id}, period={self.period}, type={self.leaderboard_type}, rank={self.rank})>"
    
    @property
    def rank_movement(self):
        """Calculate rank movement from previous period"""
        if self.previous_rank is None:
            return 0
        return self.previous_rank - self.rank
    
    @property
    def movement_text(self):
        """Human readable rank movement"""
        movement = self.rank_movement
        if movement > 0:
            return f"↑{movement}"
        elif movement < 0:
            return f"↓{abs(movement)}"
        else:
            return "="

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    icon = Column(String(50))
    badge_color = Column(String(7))
    
    # Achievement criteria
    points_threshold = Column(Integer)
    accuracy_threshold = Column(DECIMAL(5, 2))
    streak_threshold = Column(Integer)
    predictions_threshold = Column(Integer)
    category_specific = Column(String)
    
    # Rarity and rewards
    rarity = Column(String(20), default="common")
    reward_points = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement", cascade="all, delete-orphan")

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(String, ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    points_earned = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")
    
    __table_args__ = (
        Index('idx_user_achievements_user', 'user_id'),
        Index('idx_user_achievements_unique', 'user_id', 'achievement_id', unique=True),
    )