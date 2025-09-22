# app/services/category_service.py - FAST: Category service with caching
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

from ..controllers.category_controller import CategoryController
from ..models.category import Category
from ..models.prediction import Prediction

logger = logging.getLogger(__name__)

class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.category_controller = CategoryController(db)
        # Simple in-memory cache for categories (they don't change often)
        self._categories_cache = None
        self._cache_timestamp = None
        self._cache_ttl = 300  # 5 minutes TTL

    async def get_all_categories(self, include_counts: bool = True) -> List[Dict[str, Any]]:
        """Get all active categories with optional prediction counts"""
        try:
            # Check cache first for fast response
            if self._is_cache_valid():
                logger.info("📂 CategoryService: Returning cached categories")
                categories = self._categories_cache
            else:
                logger.info("📂 CategoryService: Loading categories from database")
                categories = self.category_controller.get_all_categories()
                # Update cache
                self._categories_cache = categories
                self._cache_timestamp = datetime.utcnow()

            if not include_counts:
                return [self._format_category(cat) for cat in categories]

            # Get prediction counts efficiently with single query
            category_ids = [cat.id for cat in categories]
            prediction_counts = self._get_prediction_counts_batch(category_ids)

            formatted_categories = []
            for category in categories:
                formatted_cat = self._format_category(category)
                formatted_cat['prediction_count'] = prediction_counts.get(category.id, 0)
                formatted_categories.append(formatted_cat)

            logger.info(f"✅ CategoryService: Returning {len(formatted_categories)} categories")
            return formatted_categories

        except Exception as e:
            logger.error(f"❌ CategoryService: Error getting categories: {str(e)}")
            # Return fallback categories on error
            return self._get_fallback_categories()

    async def get_category_by_id(self, category_id: str) -> Optional[Dict[str, Any]]:
        """Get single category by ID"""
        try:
            category = self.category_controller.get_category_by_id(category_id)
            if not category:
                return None

            formatted_cat = self._format_category(category)
            
            # Add prediction count
            prediction_count = self.category_controller.get_prediction_count(category_id)
            formatted_cat['prediction_count'] = prediction_count

            return formatted_cat

        except Exception as e:
            logger.error(f"❌ CategoryService: Error getting category {category_id}: {str(e)}")
            return None

    async def get_category_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get single category by slug"""
        try:
            category = self.category_controller.get_category_by_slug(slug)
            if not category:
                return None

            return self._format_category(category)

        except Exception as e:
            logger.error(f"❌ CategoryService: Error getting category by slug {slug}: {str(e)}")
            return None

    async def create_category(self, category_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new category (admin only)"""
        try:
            category = self.category_controller.create_category(category_data)
            
            # Clear cache
            self._clear_cache()
            
            return self._format_category(category)

        except Exception as e:
            logger.error(f"❌ CategoryService: Error creating category: {str(e)}")
            raise

    async def update_category(self, category_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update category (admin only)"""
        try:
            category = self.category_controller.update_category(category_id, update_data)
            if not category:
                return None

            # Clear cache
            self._clear_cache()

            return self._format_category(category)

        except Exception as e:
            logger.error(f"❌ CategoryService: Error updating category {category_id}: {str(e)}")
            raise

    async def delete_category(self, category_id: str) -> bool:
        """Delete category (admin only, only if no predictions)"""
        try:
            success = self.category_controller.delete_category(category_id)
            
            if success:
                # Clear cache
                self._clear_cache()

            return success

        except Exception as e:
            logger.error(f"❌ CategoryService: Error deleting category {category_id}: {str(e)}")
            raise

    def _get_prediction_counts_batch(self, category_ids: List[str]) -> Dict[str, int]:
        """Get prediction counts for multiple categories in single query"""
        try:
            counts = (
                self.db.query(
                    Prediction.category_id,
                    func.count(Prediction.id).label('count')
                )
                .filter(
                    Prediction.category_id.in_(category_ids),
                    Prediction.status != 'cancelled'  # Exclude cancelled predictions
                )
                .group_by(Prediction.category_id)
                .all()
            )
            
            return {category_id: count for category_id, count in counts}

        except Exception as e:
            logger.error(f"❌ CategoryService: Error getting prediction counts: {str(e)}")
            return {}

    def _format_category(self, category: Category) -> Dict[str, Any]:
        """Format category for frontend"""
        return {
            'id': category.id,
            'name': category.name,
            'slug': category.slug,
            'description': category.description,
            'icon_name': category.icon_name,
            'color': category.color,
            'category_type': category.category_type.value if hasattr(category.category_type, 'value') else str(category.category_type),
            'is_active': category.is_active,
            'sort_order': category.sort_order,
            'created_at': category.created_at.isoformat() if category.created_at else None,
            'updated_at': category.updated_at.isoformat() if category.updated_at else None,
        }

    def _is_cache_valid(self) -> bool:
        """Check if categories cache is still valid"""
        if not self._categories_cache or not self._cache_timestamp:
            return False
        
        cache_age = (datetime.utcnow() - self._cache_timestamp).total_seconds()
        return cache_age < self._cache_ttl

    def _clear_cache(self):
        """Clear categories cache"""
        self._categories_cache = None
        self._cache_timestamp = None

    def _get_fallback_categories(self) -> List[Dict[str, Any]]:
        """Return fallback categories when DB fails"""
        return [
            {
                'id': 'sports',
                'name': '⚽ Sports',
                'slug': 'sports',
                'description': None,
                'icon_name': 'football',
                'color': '#FF6B35',
                'category_type': 'sports',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            },
            {
                'id': 'pop-culture',
                'name': '🎭 Pop Culture',
                'slug': 'pop-culture',
                'description': None,
                'icon_name': 'musical-notes',
                'color': '#8B5CF6',
                'category_type': 'culture',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            },
            {
                'id': 'entertainment',
                'name': '🎬 TV & Movies',
                'slug': 'entertainment',
                'description': None,
                'icon_name': 'tv',
                'color': '#F59E0B',
                'category_type': 'entertainment',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            },
            {
                'id': 'social-media',
                'name': '📱 Social Drama',
                'slug': 'social-media',
                'description': None,
                'icon_name': 'phone-portrait',
                'color': '#EF4444',
                'category_type': 'social_media',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            },
            {
                'id': 'trending',
                'name': '🔥 Viral',
                'slug': 'trending',
                'description': None,
                'icon_name': 'flame',
                'color': '#10B981',
                'category_type': 'trending',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            },
            {
                'id': 'technology',
                'name': '💻 Technology',
                'slug': 'technology',
                'description': None,
                'icon_name': 'laptop',
                'color': '#3B82F6',
                'category_type': 'technology',
                'is_active': True,
                'sort_order': 1,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            },
            {
                'id': 'other',
                'name': '🤔 Other',
                'slug': 'other',
                'description': None,
                'icon_name': 'help-circle',
                'color': '#6B7280',
                'category_type': 'other',
                'is_active': True,
                'sort_order': 99,
                'prediction_count': 0,
                'created_at': None,
                'updated_at': None
            }
        ]