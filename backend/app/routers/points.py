# app/routers/points.py - Updated Points Management Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..controllers.points_controller import PointsController

router = APIRouter(prefix="/api/points", tags=["points"])  # Add /api

# Response Models
class UserBalanceResponse(BaseModel):
    balance: int

class UserStatsResponse(BaseModel):
    total_points: int
    total_staked: int
    total_won: int
    referral_points_earned: int
    current_streak: int
    longest_streak: int
    predictions_correct: int
    can_claim_daily_bonus: bool

class ClaimDailyBonusResponse(BaseModel):
    success: bool
    bonus_amount: Optional[int] = None
    new_balance: Optional[int] = None
    error: Optional[str] = None

class PointsTransactionResponse(BaseModel):
    id: str
    type: str
    amount: int
    balance_after: int
    description: Optional[str]
    created_at: str
    prediction_id: Optional[str]

class StakeValidationResponse(BaseModel):
    can_afford: bool
    current_balance: int
    stake_amount: int
    remaining_balance: int
    error: Optional[str] = None

class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_id: str
    username: str
    total_points: int
    current_streak: int
    longest_streak: int
    predictions_correct: int

# Endpoints
@router.get("/balance", response_model=UserBalanceResponse)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current points balance"""
    controller = PointsController(db)
    return controller.get_user_balance(current_user.id)

@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive user points statistics"""
    controller = PointsController(db)
    return controller.get_user_stats(current_user.id)

@router.post("/daily-bonus", response_model=ClaimDailyBonusResponse)
async def claim_daily_bonus(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Claim daily bonus"""
    controller = PointsController(db)
    result = controller.claim_daily_bonus(current_user.id)
    return ClaimDailyBonusResponse(**result)

@router.get("/transactions", response_model=List[PointsTransactionResponse])
async def get_transaction_history(
    limit: int = Query(20, ge=1, le=100, description="Number of transactions to return"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get points transaction history with optional filtering"""
    controller = PointsController(db)
    transactions = controller.get_transaction_history(
        current_user.id, 
        limit=limit, 
        transaction_type=transaction_type
    )
    return transactions

@router.get("/can-claim-bonus")
async def can_claim_bonus(
    current_user: User = Depends(get_current_user)
):
    """Check if user can claim daily bonus"""
    return {"can_claim": current_user.can_claim_daily_bonus()}

@router.get("/validate-stake", response_model=StakeValidationResponse)
async def validate_stake(
    stake_amount: int = Query(..., ge=1, description="Amount to stake"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate if user can afford a stake amount"""
    controller = PointsController(db)
    return controller.validate_stake_amount(current_user.id, stake_amount)

@router.get("/leaderboard", response_model=List[LeaderboardEntryResponse])
async def get_points_leaderboard(
    limit: int = Query(10, ge=1, le=50, description="Number of top users to return"),
    db: Session = Depends(get_db)
):
    """Get points leaderboard"""
    controller = PointsController(db)
    return controller.get_leaderboard_by_points(limit)

# Admin endpoints (you might want to add authentication middleware for these)
@router.get("/transaction-types")
async def get_transaction_types():
    """Get available transaction types"""
    from ..models.points_transaction import TransactionType
    return {
        "transaction_types": [
            {
                "value": t.value,
                "name": t.name.replace("_", " ").title()
            }
            for t in TransactionType
        ]
    }