# app/controllers/points_controller.py
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from fastapi import HTTPException

from ..models.user import User
from ..models.points_transaction import PointsTransaction, TransactionType
from ..services.points_service import PointsService

class PointsController:
    def __init__(self, db: Session):
        self.db = db
        self.points_service = PointsService(db)
    
    def get_user_balance(self, user_id: str) -> Dict[str, int]:
        """Get user's current points balance"""
        try:
            balance = self.points_service.get_user_balance(user_id)
            return {"balance": balance}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching balance: {str(e)}")
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user points statistics"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return {
                "total_points": user.total_points,
                "total_staked": user.total_staked,
                "total_won": user.total_won,
                "referral_points_earned": user.referral_points_earned,
                "current_streak": user.current_streak,
                "longest_streak": user.longest_streak,
                "predictions_correct": user.predictions_correct,
                "can_claim_daily_bonus": user.can_claim_daily_bonus()
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching user stats: {str(e)}")
    
    def claim_daily_bonus(self, user_id: str) -> Dict[str, Any]:
        """Claim daily bonus for user"""
        try:
            result = self.points_service.claim_daily_bonus(user_id)
            if not result.get("success"):
                raise HTTPException(status_code=400, detail=result.get("error", "Cannot claim bonus"))
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error claiming daily bonus: {str(e)}")
    
    def get_transaction_history(self, user_id: str, limit: int = 20, transaction_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get user's points transaction history with optional filtering"""
        try:
            if limit > 100:  # Reasonable limit
                limit = 100
            
            query = (self.db.query(PointsTransaction)
                    .filter(PointsTransaction.user_id == user_id)
                    .order_by(PointsTransaction.created_at.desc()))
            
            if transaction_type:
                # Validate transaction type
                if transaction_type not in [t.value for t in TransactionType]:
                    raise HTTPException(status_code=400, detail=f"Invalid transaction type: {transaction_type}")
                query = query.filter(PointsTransaction.transaction_type == transaction_type)
            
            transactions = query.limit(limit).all()
            
            return [
                {
                    "id": t.id,
                    "type": t.transaction_type,
                    "amount": t.amount,
                    "balance_after": t.balance_after,
                    "description": t.description,
                    "created_at": t.created_at.isoformat(),
                    "prediction_id": t.prediction_id
                }
                for t in transactions
            ]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching transaction history: {str(e)}")
    
    def validate_stake_amount(self, user_id: str, stake_amount: int) -> Dict[str, Any]:
        """Validate if user can afford a stake amount"""
        try:
            if stake_amount <= 0:
                return {"can_afford": False, "error": "Stake amount must be positive"}
            
            can_afford = self.points_service.can_afford_stake(user_id, stake_amount)
            current_balance = self.points_service.get_user_balance(user_id)
            
            return {
                "can_afford": can_afford,
                "current_balance": current_balance,
                "stake_amount": stake_amount,
                "remaining_balance": current_balance - stake_amount if can_afford else current_balance
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error validating stake: {str(e)}")
    
    def get_leaderboard_by_points(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get points leaderboard"""
        try:
            if limit > 50:  # Reasonable limit
                limit = 50
                
            users = (self.db.query(User)
                    .filter(User.total_points > 0)
                    .order_by(User.total_points.desc())
                    .limit(limit)
                    .all())
            
            return [
                {
                    "rank": idx + 1,
                    "user_id": user.id,
                    "username": user.username,
                    "total_points": user.total_points,
                    "current_streak": user.current_streak,
                    "longest_streak": user.longest_streak,
                    "predictions_correct": user.predictions_correct
                }
                for idx, user in enumerate(users)
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching points leaderboard: {str(e)}")