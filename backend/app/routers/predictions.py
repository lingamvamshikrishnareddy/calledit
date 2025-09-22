# app/routers/predictions.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..models.prediction import Prediction, PredictionStatus
from ..services.prediction_service import PredictionService

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

class CreatePredictionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category_id: str
    closes_at: Optional[datetime] = Field(None, description="When voting closes (optional)")

class PredictionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)

class PredictionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: Optional[dict]
    creator: dict
    status: str
    yes_votes: int = 0
    no_votes: int = 0
    total_votes: int = 0
    points_awarded: int = 100
    closes_at: Optional[str]
    created_at: str
    resolved_at: Optional[str] = None
    resolution: Optional[bool] = None
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
    created_at: Optional[str]

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
    """Get public predictions with optional filtering and pagination"""
    try:
        service = PredictionService(db)
        predictions = await service.get_predictions(
            user_id=current_user.id,
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
    request: CreatePredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new prediction"""
    try:
        closes_at = request.closes_at
        if not closes_at:
            closes_at = datetime.utcnow() + timedelta(days=1)

        prediction_data = {
            'title': request.title,
            'description': request.description,
            'category_id': request.category_id,
            'created_by': current_user.id,
            'closes_at': closes_at
        }

        service = PredictionService(db)
        prediction = await service.create_prediction(prediction_data, current_user.id)
        
        # Update user stats if user has predictions_made attribute
        if hasattr(current_user, 'predictions_made'):
            current_user.predictions_made += 1
            db.commit()
        
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create prediction")

@router.get("/my-predictions", response_model=List[PredictionResponse])
async def get_my_predictions(
    limit: int = Query(20, le=100, ge=1),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get predictions created by current user"""
    try:
        service = PredictionService(db)
        predictions = await service.get_user_predictions(current_user.id, limit, offset)
        
        # Apply status filter if provided
        if status:
            predictions = [p for p in predictions if p.get('status') == status]
        
        return predictions
    except Exception as e:
        print(f"Error getting user's predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve your predictions")

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

@router.get("/{prediction_id}", response_model=PredictionResponse)
async def get_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific prediction by ID"""
    try:
        service = PredictionService(db)
        prediction = await service.get_prediction_by_id(prediction_id, current_user.id)
        
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
    """Update a prediction (only by creator before resolution)"""
    try:
        service = PredictionService(db)
        
        update_dict = update_data.dict(exclude_unset=True)
        prediction = await service.update_prediction(prediction_id, current_user.id, update_dict)
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found or cannot be updated")
        
        return prediction
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
    """Delete a prediction (only by creator if no votes exist)"""
    try:
        service = PredictionService(db)
        success = await service.delete_prediction(prediction_id, current_user.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Prediction not found or cannot be deleted")
        
        # Update user stats if user has predictions_made attribute
        if hasattr(current_user, 'predictions_made'):
            current_user.predictions_made -= 1
            db.commit()
        
        return {"message": "Prediction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete prediction")

@router.get("/trending", response_model=List[PredictionResponse])
async def get_trending_predictions(
    limit: int = Query(10, le=50, ge=1, description="Maximum number of trending predictions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trending predictions (most voted recently)"""
    try:
        service = PredictionService(db)
        predictions = await service.get_trending_predictions(current_user.id, limit)
        return predictions
    except Exception as e:
        print(f"Error getting trending predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trending predictions")