# app/controllers/category_controller.py - FIXED: Correct Category import
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# FIXED: Import Category from standalone module
from ..models.category import Category

class CategoryController:
    def __init__(self, db: Session):
        self.db = db
    
    def create_category(self, category_data: Dict[str, Any]) -> Category:
        """Create a new category"""
        category = Category(
            id=category_data.get('id', str(uuid.uuid4())),
            name=category_data['name'],
            slug=category_data.get('slug', category_data['name'].lower().replace(' ', '_')),
            description=category_data.get('description'),
            icon_name=category_data.get('icon_name', 'help-circle'),
            color=category_data.get('color', '#6B7280'),
            category_type=category_data.get('category_type', 'other'),
            is_active=category_data.get('is_active', True),
            sort_order=category_data.get('sort_order', 0),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def get_category_by_id(self, category_id: str) -> Optional[Category]:
        """Get category by ID"""
        return (self.db.query(Category)
                .filter(Category.id == category_id)
                .first())
    
    def get_category_by_slug(self, slug: str) -> Optional[Category]:
        """Get category by slug"""
        return (self.db.query(Category)
                .filter(Category.slug == slug)
                .first())
    
    def get_all_categories(self) -> List[Category]:
        """Get all active categories ordered by sort_order"""
        return (self.db.query(Category)
                .filter(Category.is_active == True)
                .order_by(Category.sort_order, Category.name)
                .all())
    
    def update_category(self, category_id: str, update_data: Dict[str, Any]) -> Optional[Category]:
        """Update category"""
        category = self.get_category_by_id(category_id)
        if not category:
            return None
        
        allowed_fields = ['name', 'slug', 'description', 'icon_name', 'color', 
                         'category_type', 'is_active', 'sort_order']
        
        for field, value in update_data.items():
            if field in allowed_fields:
                setattr(category, field, value)
        
        category.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def delete_category(self, category_id: str) -> bool:
        """Delete category (only if no predictions exist)"""
        category = self.get_category_by_id(category_id)
        if not category:
            return False
        
        # Check if there are any predictions in this category
        from ..models.prediction import Prediction
        prediction_count = (self.db.query(Prediction)
                           .filter(Prediction.category_id == category_id)
                           .count())
        
        if prediction_count > 0:
            return False  # Cannot delete category with predictions
        
        self.db.delete(category)
        self.db.commit()
        
        return True
    
    def get_categories_with_counts(self) -> List[Dict[str, Any]]:
        """Get categories with prediction counts"""
        from ..models.prediction import Prediction
        
        categories_with_counts = (
            self.db.query(
                Category,
                func.count(Prediction.id).label('prediction_count')
            )
            .outerjoin(Prediction, Category.id == Prediction.category_id)
            .filter(Category.is_active == True)
            .group_by(Category.id)
            .order_by(Category.sort_order, Category.name)
            .all()
        )
        
        result = []
        for category, count in categories_with_counts:
            result.append({
                'category': category,
                'prediction_count': count or 0
            })
        
        return result
    
    def get_prediction_count(self, category_id: str) -> int:
        """Get prediction count for a category"""
        from ..models.prediction import Prediction
        return (self.db.query(Prediction)
                .filter(Prediction.category_id == category_id)
                .count())