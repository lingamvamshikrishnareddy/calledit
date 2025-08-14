# app/routers/predictions.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..services.prediction_service import PredictionService
from ..models.user import User

router = APIRouter(prefix="/predictions", tags=["predictions"])

class PredictionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: str
    closes_at: datetime

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

@router.get("/", response_model=List[PredictionResponse])
async def get_predictions(
    category: Optional[str] = None,
    status: Optional[str] = "active",
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = PredictionService(db)
    predictions = await service.get_predictions(
        user_id=str(current_user.id),
        category=category,
        status=status,
        limit=limit,
        offset=offset
    )
    return predictions

@router.post("/", response_model=PredictionResponse)
async def create_prediction(
    prediction_data: PredictionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = PredictionService(db)
    try:
        prediction = await service.create_prediction(
            prediction_data.dict(),
            str(current_user.id)
        )
        return prediction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/categories")
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = PredictionService(db)
    categories = await service.get_categories()
    return categories

@router.get("/trending")
async def get_trending_predictions(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = PredictionService(db)
    predictions = await service.get_trending_predictions(str(current_user.id), limit)
    return predictions

@router.get("/{prediction_id}", response_model=PredictionResponse)
async def get_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = PredictionService(db)
    prediction = await service.get_prediction_by_id(prediction_id, str(current_user.id))
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return prediction