# app/routers/leaderboard.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..services.leaderboard_service import LeaderboardService
from ..models.user import User

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

class LeaderboardEntry(BaseModel):
    rank: int
    user: dict
    points: int
    predictions_made: int
    predictions_correct: int
    accuracy_rate: float
    streak: int

@router.get("/", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    period: str = Query("weekly", regex="^(weekly|monthly|all_time)$"),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = LeaderboardService(db)
    try:
        leaderboard = await service.get_leaderboard(period, limit)
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/friends", response_model=List[LeaderboardEntry])
async def get_friends_leaderboard(
    period: str = Query("weekly", regex="^(weekly|monthly|all_time)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = LeaderboardService(db)
    leaderboard = await service.get_friends_leaderboard(str(current_user.id), period)
    return leaderboard

@router.get("/my-rank")
async def get_my_rank(
    period: str = Query("weekly", regex="^(weekly|monthly|all_time)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = LeaderboardService(db)
    try:
        rank_data = await service.get_user_rank(str(current_user.id), period)
        return rank_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

