# app/routers/predictions.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..services.prediction_service import PredictionService
from ..models.user import User

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

class PredictionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category_id: str
    closes_at: datetime

class PredictionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = None
    closes_at: Optional[datetime] = None

class PredictionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: dict
    creator: dict
    status: str
    yes_votes: int
    no_votes: int
    total_votes: int
    points_awarded: int
    closes_at: str
    created_at: str
    user_vote: Optional[bool] = None

    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    icon_name: Optional[str]
    color: str
    prediction_count: int
    created_at: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[PredictionResponse])
async def get_predictions(
    category: Optional[str] = Query(None, description="Filter by category ID"),
    status: Optional[str] = Query("active", description="Filter by status"),
    limit: int = Query(20, le=100, ge=1, description="Maximum number of predictions to return"),
    offset: int = Query(0, ge=0, description="Number of predictions to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get predictions with optional filtering and pagination"""
    try:
        service = PredictionService(db)
        predictions = await service.get_predictions(
            user_id=str(current_user.id),
            category=category,
            status=status,
            limit=limit,
            offset=offset
        )
        return predictions
    except Exception as e:
        print(f"Error getting predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve predictions")

@router.post("/", response_model=PredictionResponse)
async def create_prediction(
    prediction_data: PredictionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new prediction"""
    try:
        service = PredictionService(db)
        prediction = await service.create_prediction(
            prediction_data.dict(),
            str(current_user.id)
        )
        return prediction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error creating prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create prediction")

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all prediction categories with statistics"""
    try:
        service = PredictionService(db)
        categories = await service.get_categories()
        return categories
    except Exception as e:
        print(f"Error getting categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve categories")

@router.get("/trending", response_model=List[PredictionResponse])
async def get_trending_predictions(
    limit: int = Query(10, le=50, ge=1, description="Maximum number of trending predictions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trending predictions (most voted recently)"""
    try:
        service = PredictionService(db)
        predictions = await service.get_trending_predictions(str(current_user.id), limit)
        return predictions
    except Exception as e:
        print(f"Error getting trending predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trending predictions")

@router.get("/user/{user_id}", response_model=List[PredictionResponse])
async def get_user_predictions(
    user_id: str,
    limit: int = Query(20, le=100, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get predictions created by a specific user"""
    try:
        service = PredictionService(db)
        predictions = await service.get_user_predictions(user_id, limit, offset)
        return predictions
    except Exception as e:
        print(f"Error getting user predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user predictions")

@router.get("/my-predictions", response_model=List[PredictionResponse])
async def get_my_predictions(
    limit: int = Query(20, le=100, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get predictions created by current user"""
    try:
        service = PredictionService(db)
        predictions = await service.get_user_predictions(str(current_user.id), limit, offset)
        return predictions
    except Exception as e:
        print(f"Error getting user's predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve your predictions")

@router.get("/{prediction_id}", response_model=PredictionResponse)
async def get_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific prediction by ID"""
    try:
        service = PredictionService(db)
        prediction = await service.get_prediction_by_id(prediction_id, str(current_user.id))
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        return prediction
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve prediction")

@router.put("/{prediction_id}", response_model=PredictionResponse)
async def update_prediction(
    prediction_id: str,
    update_data: PredictionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a prediction (only by creator or admin)"""
    try:
        service = PredictionService(db)
        prediction = await service.update_prediction(
            prediction_id,
            str(current_user.id),
            update_data.dict(exclude_unset=True)
        )
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        return prediction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update prediction")

@router.delete("/{prediction_id}")
async def delete_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a prediction (only by creator or admin, only if no votes)"""
    try:
        service = PredictionService(db)
        success = await service.delete_prediction(prediction_id, str(current_user.id))
        if not success:
            raise HTTPException(status_code=404, detail="Prediction not found or cannot be deleted")
        return {"message": "Prediction deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete prediction")

# Admin endpoints
@router.post("/{prediction_id}/close")
async def close_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Close a prediction for voting (admin only)"""
    # Add admin check here
    if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        service = PredictionService(db)
        prediction = await service.close_prediction(prediction_id)
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        return prediction
    except Exception as e:
        print(f"Error closing prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to close prediction")

@router.post("/{prediction_id}/resolve")
async def resolve_prediction(
    prediction_id: str,
    resolution: bool,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resolve a prediction with outcome (admin only)"""
    # Add admin check here
    if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        service = PredictionService(db)
        prediction = await service.resolve_prediction(
            prediction_id, 
            resolution, 
            resolution_notes
        )
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        return prediction
    except Exception as e:
        print(f"Error resolving prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resolve prediction")

# Batch operations
@router.post("/batch/close-expired")
async def close_expired_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Close all expired predictions (admin only)"""
    # Add admin check here
    if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        service = PredictionService(db)
        closed_count = await service.close_expired_predictions()
        return {"message": f"Closed {closed_count} expired predictions"}
    except Exception as e:
        print(f"Error closing expired predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to close expired predictions")