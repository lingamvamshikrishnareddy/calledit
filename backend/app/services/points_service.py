from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import uuid

from ..models.user import User
from ..models.points_transaction import PointsTransaction, TransactionType
from ..models.prediction import Prediction, PredictionStatus

class PointsService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_balance(self, user_id: str) -> int:
        """Get current points balance for user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.total_points if user else 0
    
    def can_afford_stake(self, user_id: str, stake_amount: int) -> bool:
        """Check if user has enough points for stake"""
        return self.get_user_balance(user_id) >= stake_amount
    
    def deduct_stake(self, user_id: str, stake_amount: int, prediction_id: str) -> bool:
        """Deduct points for prediction stake"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or user.total_points < stake_amount:
            return False
        
        user.total_points -= stake_amount
        user.total_staked += stake_amount
        
        # Record transaction
        transaction = PointsTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            transaction_type=TransactionType.PREDICTION_STAKE.value,
            amount=-stake_amount,
            balance_after=user.total_points,
            prediction_id=prediction_id,
            description=f"Staked {stake_amount} points on prediction"
        )
        
        self.db.add(transaction)
        self.db.commit()
        return True
    
    def award_winnings(self, user_id: str, payout_amount: int, prediction_id: str) -> bool:
        """Award points for winning prediction"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.total_points += payout_amount
        user.total_won += payout_amount
        user.predictions_correct += 1
        
        # Update streak
        user.current_streak += 1
        if user.current_streak > user.longest_streak:
            user.longest_streak = user.current_streak
        
        # Record transaction
        transaction = PointsTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            transaction_type=TransactionType.PREDICTION_WIN.value,
            amount=payout_amount,
            balance_after=user.total_points,
            prediction_id=prediction_id,
            description=f"Won {payout_amount} points from prediction"
        )
        
        self.db.add(transaction)
        self.db.commit()
        return True
    
    def break_streak(self, user_id: str) -> None:
        """Break user's streak on loss"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.current_streak = 0
            self.db.commit()
    
    def claim_daily_bonus(self, user_id: str) -> Dict[str, Any]:
        """Claim daily bonus with 24-hour cooldown"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"success": False, "error": "User not found"}
        
        # Check if user can claim (24 hour cooldown)
        if not user.can_claim_daily_bonus():
            # Calculate time until next bonus
            time_since_last = datetime.utcnow() - user.daily_bonus_claimed_at.replace(tzinfo=None)
            time_until_next = timedelta(hours=24) - time_since_last
            hours_remaining = int(time_until_next.total_seconds() // 3600)
            minutes_remaining = int((time_until_next.total_seconds() % 3600) // 60)
            
            return {
                "success": False, 
                "error": f"Daily bonus already claimed. Next bonus in {hours_remaining}h {minutes_remaining}m"
            }
        
        # Award bonus
        bonus_amount = 20
        user.total_points += bonus_amount
        user.daily_bonus_claimed_at = datetime.utcnow()
        
        # Record transaction
        transaction = PointsTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            transaction_type=TransactionType.DAILY_BONUS.value,
            amount=bonus_amount,
            balance_after=user.total_points,
            description="Daily bonus claim",
            created_at=datetime.utcnow()
        )
        
        self.db.add(transaction)
        self.db.commit()
        
        return {
            "success": True, 
            "bonus_amount": bonus_amount,
            "new_balance": user.total_points,
            "next_claim_available": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }
    
    def award_referral_bonus(self, user_id: str, referred_user_id: str) -> bool:
        """Award referral bonus"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        bonus_amount = 50
        user.total_points += bonus_amount
        user.referral_points_earned += bonus_amount
        
        transaction = PointsTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            transaction_type=TransactionType.REFERRAL_BONUS.value,
            amount=bonus_amount,
            balance_after=user.total_points,
            description=f"Referral bonus for user {referred_user_id}"
        )
        
        self.db.add(transaction)
        self.db.commit()
        return True
    
    def get_transaction_history(self, user_id: str, limit: int = 20) -> list:
        """Get user's points transaction history"""
        transactions = (self.db.query(PointsTransaction)
                       .filter(PointsTransaction.user_id == user_id)
                       .order_by(PointsTransaction.created_at.desc())
                       .limit(limit)
                       .all())
        
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