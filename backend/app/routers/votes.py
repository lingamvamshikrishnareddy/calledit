# app/routers/votes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..services.vote_service import VoteService
from ..models.user import User

router = APIRouter(prefix="/votes", tags=["votes"])

class VoteCreate(BaseModel):
    prediction_id: str
    vote: bool  # True=Yes, False=No
    confidence: int = Field(default=50, ge=1, le=100, description="Confidence level between 1-100")

class VoteUpdate(BaseModel):
    vote: bool
    confidence: int = Field(ge=1, le=100, description="Confidence level between 1-100")

class VoteResponse(BaseModel):
    id: str
    prediction_id: str
    vote: bool
    confidence: int
    points_earned: int
    created_at: str
    updated_at: Optional[str] = None

class VoteWithPredictionResponse(VoteResponse):
    prediction: dict

class VoteStatisticsResponse(BaseModel):
    total_votes: int
    correct_votes: int
    accuracy_rate: float
    average_confidence: float
    total_points_earned: int
    current_streak: int
    longest_streak: int

class PredictionVotesResponse(BaseModel):
    votes: List[VoteResponse]
    distribution: dict
    average_confidence: dict

@router.post("/", response_model=VoteResponse)
async def cast_vote(
    vote_data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cast a vote on a prediction"""
    service = VoteService(db)
    try:
        vote = await service.cast_vote(
            user_id=str(current_user.id),
            prediction_id=vote_data.prediction_id,
            vote=vote_data.vote,
            confidence=vote_data.confidence
        )
        return vote
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/my-votes", response_model=List[VoteWithPredictionResponse])
async def get_my_votes(
    limit: int = Query(50, le=100, description="Maximum number of votes to return"),
    offset: int = Query(0, ge=0, description="Number of votes to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's votes with pagination"""
    service = VoteService(db)
    try:
        votes = await service.get_user_votes(str(current_user.id), limit, offset)
        return votes
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/statistics", response_model=VoteStatisticsResponse)
async def get_vote_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's voting statistics"""
    service = VoteService(db)
    try:
        stats = await service.get_vote_statistics(str(current_user.id))
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/prediction/{prediction_id}", response_model=PredictionVotesResponse)
async def get_prediction_votes(
    prediction_id: str,
    limit: int = Query(50, le=100, description="Maximum number of votes to return"),
    offset: int = Query(0, ge=0, description="Number of votes to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all votes for a specific prediction"""
    service = VoteService(db)
    try:
        result = await service.get_prediction_votes(prediction_id, limit, offset)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{vote_id}", response_model=VoteResponse)
async def update_vote(
    vote_id: str,
    vote_data: VoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing vote (only allowed on active predictions)"""
    service = VoteService(db)
    try:
        vote = await service.update_vote(
            vote_id=vote_id,
            user_id=str(current_user.id),
            new_vote=vote_data.vote,
            new_confidence=vote_data.confidence
        )
        return vote
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{vote_id}")
async def delete_vote(
    vote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a vote (only allowed on active predictions)"""
    service = VoteService(db)
    try:
        await service.delete_vote(vote_id, str(current_user.id))
        return {"message": "Vote deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# Admin endpoints for resolving predictions
@router.post("/{prediction_id}/resolve")
async def resolve_prediction_votes(
    prediction_id: str,
    resolution: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resolve all votes for a prediction (admin only)"""
    # Add admin check here
    if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    service = VoteService(db)
    try:
        result = await service.bulk_resolve_prediction_votes(prediction_id, resolution)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# Legacy endpoint for backward compatibility
@router.post("/cast", response_model=VoteResponse)
async def cast_vote_legacy(
    vote_data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint for casting votes (redirects to main endpoint)"""
    return await cast_vote(vote_data, db, current_user)