# app/controllers/category_controller.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from ..models.prediction import Category, Prediction

class CategoryController:
    def __init__(self, db: Session):
        self.db = db
    
    def create_category(self, category_data: Dict[str, Any]) -> Category:
        """Create a new category"""
        category = Category(
            id=uuid.uuid4(),
            name=category_data['name'],
            slug=category_data['slug'],
            description=category_data.get('description'),
            icon_name=category_data.get('icon_name'),
            color=category_data.get('color', '#3B82F6'),
            is_active=category_data.get('is_active', True),
            created_at=datetime.utcnow()
        )
        
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def get_category_by_id(self, category_id: str) -> Optional[Category]:
        """Get category by ID"""
        return self.db.query(Category).filter(Category.id == category_id).first()
    
    def get_category_by_slug(self, slug: str) -> Optional[Category]:
        """Get category by slug"""
        return self.db.query(Category).filter(Category.slug == slug).first()
    
    def get_all_categories(self, active_only: bool = True) -> List[Category]:
        """Get all categories"""
        query = self.db.query(Category)
        if active_only:
            query = query.filter(Category.is_active == True)
        
        return query.order_by(Category.name).all()
    
    def get_categories_with_stats(self) -> List[Dict[str, Any]]:
        """Get categories with prediction counts"""
        categories_with_counts = (
            self.db.query(
                Category,
                func.count(Prediction.id).label('prediction_count')
            )
            .outerjoin(Prediction, Category.id == Prediction.category_id)
            .filter(Category.is_active == True)
            .group_by(Category.id)
            .order_by(Category.name)
            .all()
        )
        
        return [
            {
                'id': str(category.id),
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'icon_name': category.icon_name,
                'color': category.color,
                'prediction_count': prediction_count,
                'created_at': category.created_at.isoformat()
            }
            for category, prediction_count in categories_with_counts
        ]
    
    def update_category(self, category_id: str, update_data: Dict[str, Any]) -> Optional[Category]:
        """Update category"""
        category = self.get_category_by_id(category_id)
        if not category:
            return None
        
        allowed_fields = ['name', 'slug', 'description', 'icon_name', 'color', 'is_active']
        for field, value in update_data.items():
            if field in allowed_fields:
                setattr(category, field, value)
        
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def delete_category(self, category_id: str) -> bool:
        """Soft delete category (mark as inactive)"""
        category = self.get_category_by_id(category_id)
        if not category:
            return False
        
        # Check if category has predictions
        prediction_count = (self.db.query(Prediction)
                           .filter(Prediction.category_id == category_id)
                           .count())
        
        if prediction_count > 0:
            # Soft delete - mark as inactive
            category.is_active = False
            self.db.commit()
        else:
            # Hard delete if no predictions
            self.db.delete(category)
            self.db.commit()
        
        return True
    
    def check_slug_exists(self, slug: str, exclude_id: str = None) -> bool:
        """Check if slug already exists"""
        query = self.db.query(Category).filter(Category.slug == slug)
        if exclude_id:
            query = query.filter(Category.id != exclude_id)
        
        return query.first() is not None
    
    def get_popular_categories(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most popular categories by prediction count"""
        popular_categories = (
            self.db.query(
                Category,
                func.count(Prediction.id).label('prediction_count')
            )
            .join(Prediction, Category.id == Prediction.category_id)
            .filter(Category.is_active == True)
            .group_by(Category.id)
            .order_by(desc(func.count(Prediction.id)))
            .limit(limit)
            .all()
        )
        
        return [
            {
                'id': str(category.id),
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'icon_name': category.icon_name,
                'color': category.color,
                'prediction_count': prediction_count
            }
            for category, prediction_count in popular_categories
        ]