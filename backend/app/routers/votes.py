# app/routers/votes.py - FIXED: Proper vote endpoints with correct routing
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..services.vote_service import VoteService

router = APIRouter(prefix="/api/votes", tags=["votes"])

# Request Models
class CastVoteRequest(BaseModel):
    prediction_id: str
    vote: bool  # True for YES, False for NO
    confidence: int = 75

# Response Models
class PredictionResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    closes_at: Optional[str]
    resolved_at: Optional[str]
    resolution: Optional[bool]

class VoteResponse(BaseModel):
    id: str
    prediction_id: str
    vote: bool
    confidence: int
    points_spent: int
    points_earned: int
    is_resolved: bool
    is_correct: Optional[bool]
    created_at: str
    updated_at: Optional[str]
    prediction: PredictionResponse

class VoteStatsResponse(BaseModel):
    total_votes: int
    active_votes: int
    resolved_votes: int
    correct_votes: int
    accuracy_rate: float
    win_rate: float
    average_confidence: float
    current_streak: int
    longest_streak: int
    total_points_earned: int
    total_points_spent: int

class CastVoteResponse(BaseModel):
    id: str
    prediction_id: str
    vote: bool
    confidence: int
    points_wagered: int
    new_balance: int
    created_at: str
    message: str

# FIXED: Correct vote casting endpoint
@router.post("/", response_model=CastVoteResponse)
async def cast_vote(
    vote_request: CastVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cast a vote on a prediction - FIXED route"""
    try:
        service = VoteService(db)
        
        # Log the vote attempt
        print(f"🗳️ Vote attempt: User {current_user.username} voting {vote_request.vote} on {vote_request.prediction_id}")
        
        result = await service.cast_vote(
            user_id=current_user.id,
            prediction_id=vote_request.prediction_id,
            vote=vote_request.vote,
            confidence=vote_request.confidence,
            stake_amount=10  # Default stake
        )
        
        print(f"✅ Vote cast successfully: {result}")
        
        return CastVoteResponse(
            id=result['id'],
            prediction_id=result['prediction_id'],
            vote=result['vote'],
            confidence=result['confidence'],
            points_wagered=result['points_wagered'],
            new_balance=result['new_balance'],
            created_at=result['created_at'],
            message=f"Your {'YES' if result['vote'] else 'NO'} vote has been recorded!"
        )
        
    except ValueError as e:
        print(f"❌ Vote validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Vote casting error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to cast vote: {str(e)}")

# FIXED: Correct my votes endpoint
@router.get("/my-votes", response_model=List[VoteResponse])
async def get_my_votes(
    limit: int = Query(50, ge=1, le=100, description="Number of votes to return"),
    offset: int = Query(0, ge=0, description="Number of votes to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's votes with prediction details"""
    try:
        print(f"📊 Getting votes for user: {current_user.username}, limit: {limit}, offset: {offset}")
        
        service = VoteService(db)
        votes = await service.get_user_votes(current_user.id, limit, offset)
        
        print(f"✅ Retrieved {len(votes)} votes for user {current_user.username}")
        
        # Convert to response format
        response_votes = []
        for vote in votes:
            prediction_data = vote.get('prediction', {})
            
            response_vote = VoteResponse(
                id=vote['id'],
                prediction_id=vote['prediction_id'],
                vote=vote['vote'],
                confidence=vote['confidence'],
                points_spent=vote['points_spent'],
                points_earned=vote['points_earned'],
                is_resolved=vote['is_resolved'],
                is_correct=vote['is_correct'],
                created_at=vote['created_at'],
                updated_at=vote['updated_at'],
                prediction=PredictionResponse(
                    id=prediction_data.get('id', vote['prediction_id']),
                    title=prediction_data.get('title', 'Unknown Prediction'),
                    description=prediction_data.get('description'),
                    status=prediction_data.get('status', 'unknown'),
                    closes_at=prediction_data.get('closes_at'),
                    resolved_at=prediction_data.get('resolved_at'),
                    resolution=prediction_data.get('resolution')
                )
            )
            response_votes.append(response_vote)
        
        return response_votes
        
    except Exception as e:
        print(f"❌ Error fetching user votes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching votes: {str(e)}")

@router.get("/my-stats", response_model=VoteStatsResponse)
async def get_my_vote_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's voting statistics"""
    try:
        service = VoteService(db)
        stats = await service.get_vote_statistics(current_user.id)
        return VoteStatsResponse(**stats)
    except Exception as e:
        print(f"❌ Error fetching vote statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching vote statistics: {str(e)}")

@router.get("/user/{prediction_id}")
async def get_user_vote_for_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's vote for a specific prediction"""
    try:
        service = VoteService(db)
        vote = await service.get_user_vote_for_prediction(current_user.id, prediction_id)
        return vote
    except Exception as e:
        print(f"❌ Error getting user vote: {str(e)}")
        return None

@router.get("/prediction/{prediction_id}")
async def get_prediction_votes(
    prediction_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all votes for a specific prediction"""
    try:
        service = VoteService(db)
        result = await service.get_prediction_votes(prediction_id, limit, offset)
        return result
    except Exception as e:
        print(f"❌ Error fetching prediction votes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching prediction votes: {str(e)}")

@router.put("/{vote_id}")
async def update_vote(
    vote_id: str,
    vote: bool,
    confidence: int = Query(..., ge=0, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing vote (only allowed on active predictions)"""
    try:
        service = VoteService(db)
        result = await service.update_vote(vote_id, current_user.id, vote, confidence)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating vote: {str(e)}")

@router.delete("/{vote_id}")
async def delete_vote(
    vote_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a vote (only allowed on active predictions)"""
    try:
        service = VoteService(db)
        success = await service.delete_vote(vote_id, current_user.id)
        if success:
            return {"message": "Vote deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete vote")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting vote: {str(e)}")