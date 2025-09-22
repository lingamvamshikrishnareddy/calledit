# app/models/category.py - FIXED: Add missing relationships
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..database.connection import Base

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon_name = Column(String(50), default="help-circle")
    color = Column(String(7), default="#6B7280")
    category_type = Column(String(50), default="other")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # FIXED: Add the missing relationships that other models expect
    predictions = relationship("Prediction", back_populates="category", cascade="all, delete-orphan")
    leaderboard_entries = relationship("LeaderboardEntry", back_populates="category", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name}, slug={self.slug})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'icon_name': self.icon_name,
            'color': self.color,
            'category_type': self.category_type,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }