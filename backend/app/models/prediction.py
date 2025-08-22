# app/models/prediction.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.connection import Base
import uuid
import enum

class PredictionStatus(str, enum.Enum):
    ACTIVE = "active"         # Open for voting
    CLOSED = "closed"         # Voting closed, awaiting resolution
    RESOLVED = "resolved"     # Outcome determined, points distributed
    CANCELLED = "cancelled"   # Cancelled (refund all votes)

class CategoryType(str, enum.Enum):
    SPORTS = "sports"
    CULTURE = "culture"
    ENTERTAINMENT = "entertainment"
    CELEBRITY = "celebrity"
    MUSIC = "music"
    MOVIES = "movies"
    TV_SHOWS = "tv_shows"
    SOCIAL_MEDIA = "social_media"
    FASHION = "fashion"
    GAMING = "gaming"

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    icon_name = Column(String(50))  # For UI icons
    color = Column(String(7))  # Hex color code
    category_type = Column(String(20), nullable=False)  # sports, culture, entertainment
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    predictions = relationship("Prediction", back_populates="category")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name}, type={self.category_type})>"

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Foreign keys
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Prediction state
    status = Column(String(20), default=PredictionStatus.ACTIVE.value)
    
    # Vote counts
    yes_votes = Column(Integer, default=0)
    no_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    
    # Resolution
    resolution = Column(Boolean, nullable=True)  # True=Yes, False=No, None=Unresolved
    resolution_notes = Column(Text)  # Optional explanation of resolution
    
    # Points and rewards
    points_pool = Column(Integer, default=100)  # Total points available
    base_points = Column(Integer, default=10)   # Base points per correct vote
    points_awarded = Column(Integer, default=0)  # Total points awarded after resolution
    
    # Important timestamps
    closes_at = Column(DateTime(timezone=True), nullable=False)  # When voting closes
    expected_resolution = Column(DateTime(timezone=True))  # Expected resolution date
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="predictions")
    creator = relationship("User", back_populates="predictions")
    votes = relationship("Vote", back_populates="prediction", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_predictions_status', 'status'),
        Index('idx_predictions_category', 'category_id'),
        Index('idx_predictions_creator', 'created_by'),
        Index('idx_predictions_closes_at', 'closes_at'),
        Index('idx_predictions_created_at', 'created_at'),
        Index('idx_predictions_total_votes', 'total_votes'),  # For trending predictions
        Index('idx_predictions_resolution', 'resolution'),    # For resolved predictions
    )
    
    def __repr__(self):
        return f"<Prediction(id={self.id}, title={self.title[:50]}..., status={self.status})>"
    
    @property
    def is_active(self):
        """Check if prediction is still accepting votes"""
        return self.status == PredictionStatus.ACTIVE.value
    
    @property
    def is_closed(self):
        """Check if prediction voting has closed"""
        return self.status == PredictionStatus.CLOSED.value
    
    @property
    def is_resolved(self):
        """Check if prediction has been resolved"""
        return self.status == PredictionStatus.RESOLVED.value
    
    @property
    def is_cancelled(self):
        """Check if prediction has been cancelled"""
        return self.status == PredictionStatus.CANCELLED.value
    
    @property
    def yes_percentage(self):
        """Calculate percentage of yes votes"""
        if self.total_votes == 0:
            return 50.0
        return round((self.yes_votes / self.total_votes) * 100, 1)
    
    @property
    def no_percentage(self):
        """Calculate percentage of no votes"""
        if self.total_votes == 0:
            return 50.0
        return round((self.no_votes / self.total_votes) * 100, 1)
    
    @property
    def is_expired(self):
        """Check if prediction has expired (past closing time)"""
        from datetime import datetime
        return self.closes_at <= datetime.utcnow()
    
    @property
    def time_remaining(self):
        """Get time remaining until closing (returns timedelta or None if expired)"""
        from datetime import datetime
        if self.is_expired:
            return None
        return self.closes_at - datetime.utcnow()
    
    @property
    def winning_side(self):
        """Get the winning side based on resolution"""
        if not self.is_resolved:
            return None
        return "yes" if self.resolution else "no"
    
    @property
    def losing_side(self):
        """Get the losing side based on resolution"""
        if not self.is_resolved:
            return None
        return "no" if self.resolution else "yes"
    
    @property
    def winning_votes(self):
        """Get number of winning votes"""
        if not self.is_resolved:
            return None
        return self.yes_votes if self.resolution else self.no_votes
    
    @property
    def losing_votes(self):
        """Get number of losing votes"""
        if not self.is_resolved:
            return None
        return self.no_votes if self.resolution else self.yes_votes