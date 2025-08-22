# app/routers/votes.py - Updated with direct database operations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from ..database.connection import get_db
from ..models.user import User
from ..models.vote import Vote  # Add this import
from ..models.prediction import Prediction  # Add this import

# FIXED: Import the correct auth dependency - this was missing!
# You need to create this file or adjust the import path based on your auth setup
try:
    from ..auth.dependencies import get_current_user
except ImportError:
    # Fallback - create a simple dependency
    from ..utils.jwt_utils import verify_access_token
    from fastapi import Header
    
    async def get_current_user(
        authorization: str = Header(None),
        db: Session = Depends(get_db)
    ) -> User:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = authorization.split(" ")[1]
        try:
            payload = verify_access_token(token)
            user_id = payload.get("sub")
            
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            
            return user
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

router = APIRouter(prefix="/api/votes", tags=["votes"])

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
    created_at: str
    updated_at: Optional[str] = None

@router.post("/", response_model=dict)
async def cast_vote(
    vote_data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cast or update a vote on a prediction"""
    print(f"📥 Vote request received: {vote_data.dict()}")
    print(f"👤 Current user: {current_user.username}")
    
    try:
        # Check if prediction exists and is active
        prediction = db.query(Prediction).filter(
            Prediction.id == vote_data.prediction_id
        ).first()
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        if prediction.status != "active":
            raise HTTPException(status_code=400, detail="Prediction is not active")
        
        # Check if user already voted
        existing_vote = db.query(Vote).filter(
            Vote.prediction_id == vote_data.prediction_id,
            Vote.user_id == str(current_user.id)
        ).first()
        
        if existing_vote:
            # Update existing vote
            old_vote = existing_vote.vote
            existing_vote.vote = vote_data.vote
            existing_vote.confidence = vote_data.confidence
            
            # Update prediction counts
            if old_vote != vote_data.vote:
                if old_vote:  # Was YES
                    prediction.yes_votes -= 1
                else:  # Was NO
                    prediction.no_votes -= 1
                
                if vote_data.vote:  # New YES
                    prediction.yes_votes += 1
                else:  # New NO
                    prediction.no_votes += 1
        else:
            # Create new vote
            new_vote = Vote(
                id=str(uuid.uuid4()),
                prediction_id=vote_data.prediction_id,
                user_id=str(current_user.id),
                vote=vote_data.vote,
                confidence=vote_data.confidence
            )
            db.add(new_vote)
            
            # Update prediction counts
            if vote_data.vote:
                prediction.yes_votes += 1
            else:
                prediction.no_votes += 1
        
        prediction.total_votes = prediction.yes_votes + prediction.no_votes
        
        db.commit()
        print("✅ Vote cast successfully")
        return {"message": "Vote recorded successfully"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Vote cast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-votes")
async def get_my_votes(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's votes with pagination"""
    try:
        votes = db.query(Vote).filter(
            Vote.user_id == str(current_user.id)
        ).offset(offset).limit(limit).all()
        
        return [{
            "id": vote.id,
            "prediction_id": vote.prediction_id,
            "vote": vote.vote,
            "confidence": vote.confidence,
            "created_at": vote.created_at.isoformat() if vote.created_at else None,
            "updated_at": vote.updated_at.isoformat() if vote.updated_at else None
        } for vote in votes]
        
    except Exception as e:
        print(f"❌ Get user votes error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/statistics")
async def get_vote_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's voting statistics"""
    try:
        total_votes = db.query(Vote).filter(
            Vote.user_id == str(current_user.id)
        ).count()
        
        yes_votes = db.query(Vote).filter(
            Vote.user_id == str(current_user.id),
            Vote.vote == True
        ).count()
        
        no_votes = db.query(Vote).filter(
            Vote.user_id == str(current_user.id),
            Vote.vote == False
        ).count()
        
        avg_confidence = db.query(Vote).filter(
            Vote.user_id == str(current_user.id)
        ).with_entities(Vote.confidence).all()
        
        if avg_confidence:
            avg_conf = sum(conf[0] for conf in avg_confidence) / len(avg_confidence)
        else:
            avg_conf = 0
        
        return {
            "total_votes": total_votes,
            "yes_votes": yes_votes,
            "no_votes": no_votes,
            "average_confidence": round(avg_conf, 2)
        }
        
    except Exception as e:
        print(f"❌ Get vote statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/prediction/{prediction_id}")
async def get_prediction_votes(
    prediction_id: str,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get votes for a specific prediction"""
    try:
        votes = db.query(Vote).filter(
            Vote.prediction_id == prediction_id
        ).offset(offset).limit(limit).all()
        
        return [{
            "id": vote.id,
            "user_id": vote.user_id,
            "vote": vote.vote,
            "confidence": vote.confidence,
            "created_at": vote.created_at.isoformat() if vote.created_at else None
        } for vote in votes]
        
    except Exception as e:
        print(f"❌ Get prediction votes error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/{prediction_id}")
async def get_user_vote_for_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's vote for a specific prediction"""
    try:
        vote = db.query(Vote).filter(
            Vote.prediction_id == prediction_id,
            Vote.user_id == str(current_user.id)
        ).first()
        
        if not vote:
            return {"has_voted": False}
        
        return {
            "has_voted": True,
            "vote": vote.vote,
            "confidence": vote.confidence,
            "created_at": vote.created_at.isoformat() if vote.created_at else None,
            "updated_at": vote.updated_at.isoformat() if vote.updated_at else None
        }
        
    except Exception as e:
        print(f"❌ Get user vote error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Health check endpoint
@router.get("/health")
async def votes_health():
    """Health check endpoint for votes router"""
    return {"status": "ok", "router": "votes", "endpoints_available": True}