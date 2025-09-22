# app/routers/categories.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging

from ..database.connection import get_db
from ..services.category_service import CategoryService
from ..auth.dependencies import get_current_user, get_current_admin_user
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_categories(
    include_counts: bool = Query(True, description="Include prediction counts"),
    db: Session = Depends(get_db)
):
    """
    Get all active categories with optional prediction counts
    """
    try:
        logger.info("GET /categories - Starting request")
        
        category_service = CategoryService(db)
        categories = await category_service.get_all_categories(include_counts=include_counts)
        
        logger.info(f"GET /categories - Returning {len(categories)} categories")
        return categories
        
    except Exception as e:
        logger.error(f"GET /categories - Error: {str(e)}")
        # Return fallback data instead of error for better UX
        return [
            {
                'id': 'sports',
                'name': 'Sports',
                'slug': 'sports',
                'description': None,
                'icon_name': 'football',
                'color': '#FF6B35',
                'category_type': 'sports',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0
            },
            {
                'id': 'pop-culture',
                'name': 'Pop Culture',
                'slug': 'pop-culture',
                'description': None,
                'icon_name': 'musical-notes',
                'color': '#8B5CF6',
                'category_type': 'culture',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0
            },
            {
                'id': 'entertainment',
                'name': 'TV & Movies',
                'slug': 'entertainment',
                'description': None,
                'icon_name': 'tv',
                'color': '#F59E0B',
                'category_type': 'entertainment',
                'is_active': True,
                'sort_order': 0,
                'prediction_count': 0
            },
            {
                'id': 'technology',
                'name': 'Technology',
                'slug': 'technology',
                'description': None,
                'icon_name': 'laptop',
                'color': '#3B82F6',
                'category_type': 'technology',
                'is_active': True,
                'sort_order': 1,
                'prediction_count': 0
            },
            {
                'id': 'crypto',
                'name': 'Crypto',
                'slug': 'crypto',
                'description': None,
                'icon_name': 'logo-bitcoin',
                'color': '#F97316',
                'category_type': 'crypto',
                'is_active': True,
                'sort_order': 2,
                'prediction_count': 0
            },
            {
                'id': 'other',
                'name': 'Other',
                'slug': 'other',
                'description': None,
                'icon_name': 'help-circle',
                'color': '#6B7280',
                'category_type': 'other',
                'is_active': True,
                'sort_order': 99,
                'prediction_count': 0
            }
        ]

@router.get("/{category_id}", response_model=Dict[str, Any])
async def get_category(
    category_id: str,
    db: Session = Depends(get_db)
):
    """Get single category by ID"""
    try:
        logger.info(f"GET /categories/{category_id}")
        
        category_service = CategoryService(db)
        category = await category_service.get_category_by_id(category_id)
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        logger.info(f"GET /categories/{category_id} - Category found")
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GET /categories/{category_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get category")

@router.get("/slug/{slug}", response_model=Dict[str, Any])
async def get_category_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """Get single category by slug"""
    try:
        logger.info(f"GET /categories/slug/{slug}")
        
        category_service = CategoryService(db)
        category = await category_service.get_category_by_slug(slug)
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        logger.info(f"GET /categories/slug/{slug} - Category found")
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GET /categories/slug/{slug} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get category")

# Admin-only endpoints
@router.post("/", response_model=Dict[str, Any])
async def create_category(
    category_data: dict,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Create new category (admin only)"""
    try:
        logger.info(f"POST /categories - Admin: {admin_user.username}")
        
        category_service = CategoryService(db)
        category = await category_service.create_category(category_data)
        
        logger.info(f"POST /categories - Category created: {category['id']}")
        return category
        
    except Exception as e:
        logger.error(f"POST /categories - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create category")

@router.put("/{category_id}", response_model=Dict[str, Any])
async def update_category(
    category_id: str,
    update_data: dict,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Update category (admin only)"""
    try:
        logger.info(f"PUT /categories/{category_id} - Admin: {admin_user.username}")
        
        category_service = CategoryService(db)
        category = await category_service.update_category(category_id, update_data)
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        logger.info(f"PUT /categories/{category_id} - Category updated")
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUT /categories/{category_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update category")

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Delete category (admin only, only if no predictions)"""
    try:
        logger.info(f"DELETE /categories/{category_id} - Admin: {admin_user.username}")
        
        category_service = CategoryService(db)
        success = await category_service.delete_category(category_id)
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete category - it may have predictions or not exist"
            )
        
        logger.info(f"DELETE /categories/{category_id} - Category deleted")
        return {"message": "Category deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DELETE /categories/{category_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete category")