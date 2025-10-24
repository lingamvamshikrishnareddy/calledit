# app/services/vote_service.py - FIXED: Proper vote count updates
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, func
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid
import logging

from ..controllers.vote_controller import VoteController
from ..models.vote import Vote
from ..models.prediction import Prediction
from ..models.user import User
from ..models.points_transaction import PointsTransaction, TransactionType

logger = logging.getLogger(__name__)

class VoteService:
    def __init__(self, db: Session):
        self.db = db
        self.vote_controller = VoteController(db)

    def _normalize_datetime(self, dt):
        """Convert datetime to UTC timezone-aware datetime for safe comparison"""
        if dt is None:
            return None
        
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            else:
                return dt.astimezone(timezone.utc)
        
        return dt

    def _get_current_utc_time(self):
        """Get current UTC time as timezone-aware datetime"""
        return datetime.now(timezone.utc)

    def _calculate_minority_bonus_multiplier(self, user_vote: bool, yes_percentage: float) -> float:
        """Calculate minority bonus multiplier based on vote distribution"""
        user_side_percentage = yes_percentage if user_vote else (100 - yes_percentage)
        
        if user_side_percentage < 20:
            return 1.0  # +1× bonus (3× total payout)
        elif user_side_percentage < 40:
            return 0.5  # +0.5× bonus (2.5× total payout)
        else:
            return 0.0  # No bonus (2× base payout)

    async def cast_vote(self, user_id: str, prediction_id: str, vote: bool, 
                       confidence: int = 75, stake_amount: int = 10) -> Dict[str, Any]:
        """Cast a vote with points deduction"""
        
        logger.info(f"Attempting to cast vote: user={user_id}, prediction={prediction_id}, vote={vote}")
        
        # Get user and check balance
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found")
            raise ValueError("User not found")
        
        logger.info(f"User {user.username} has {user.total_points} points, needs {stake_amount}")
        
        if user.total_points < stake_amount:
            raise ValueError(f"Insufficient points. You have {user.total_points} but need {stake_amount}")
        
        # Check prediction validity
        prediction = (self.db.query(Prediction)
                     .options(joinedload(Prediction.creator))
                     .filter(Prediction.id == prediction_id)
                     .first())
        
        if not prediction:
            logger.error(f"Prediction {prediction_id} not found")
            raise ValueError("Prediction not found")
        
        if prediction.status != "active":
            logger.error(f"Prediction {prediction_id} status is {prediction.status}, not active")
            raise ValueError("This prediction is no longer accepting votes")
        
        # Check if voting is still open
        if prediction.closes_at:
            current_time = self._get_current_utc_time()
            closes_at_normalized = self._normalize_datetime(prediction.closes_at)
            
            if closes_at_normalized and closes_at_normalized <= current_time:
                logger.error(f"Prediction {prediction_id} closed at {closes_at_normalized}")
                raise ValueError("Voting has closed for this prediction")
        
        # Check for existing vote
        existing_vote = (self.db.query(Vote)
                        .filter(and_(Vote.user_id == user_id, Vote.prediction_id == prediction_id))
                        .first())
        
        if existing_vote:
            logger.error(f"User {user_id} already voted on prediction {prediction_id}")
            raise ValueError("You have already voted on this prediction")
        
        try:
            # Deduct points from user
            user.total_points -= stake_amount
            user.total_staked = (user.total_staked or 0) + stake_amount
            
            # Create vote
            vote_data = {
                'user_id': user_id,
                'prediction_id': prediction_id,
                'vote': vote,
                'confidence': confidence,
                'points_wagered': stake_amount,
                'points_spent': stake_amount,
                'points_earned': 0,
                'is_resolved': False,
                'is_correct': None,
            }
            
            new_vote = self.vote_controller.create_vote(vote_data)
            logger.info(f"Vote created with ID: {new_vote.id}")
            
            # FIXED: Update prediction vote counts IMMEDIATELY using direct DB query
            if vote:  # YES vote
                prediction.yes_votes = (prediction.yes_votes or 0) + 1
            else:  # NO vote
                prediction.no_votes = (prediction.no_votes or 0) + 1
            
            prediction.total_votes = prediction.yes_votes + prediction.no_votes
            prediction.updated_at = self._get_current_utc_time()
            
            logger.info(f"Updated prediction {prediction_id} vote counts: Yes={prediction.yes_votes}, No={prediction.no_votes}")
            
            # Record points transaction
            transaction = PointsTransaction(
                id=str(uuid.uuid4()),
                user_id=user_id,
                transaction_type=TransactionType.PREDICTION_STAKE.value,
                amount=-stake_amount,
                balance_after=user.total_points,
                prediction_id=prediction_id,
                description=f"Staked {stake_amount} points on prediction: {prediction.title[:50]}...",
                created_at=self._get_current_utc_time()
            )
            
            self.db.add(transaction)
            self.db.commit()
            
            logger.info(f"✅ Vote successfully cast and committed to DB")
            
            return {
                'id': str(new_vote.id),
                'prediction_id': str(new_vote.prediction_id),
                'vote': new_vote.vote,
                'confidence': new_vote.confidence,
                'points_wagered': stake_amount,
                'points_spent': stake_amount,
                'new_balance': user.total_points,
                'created_at': new_vote.created_at.isoformat() if new_vote.created_at else self._get_current_utc_time().isoformat(),
                'message': f"Your {'YES' if vote else 'NO'} vote has been recorded!",
                'prediction': {
                    'title': prediction.title,
                    'description': prediction.description,
                    'yes_votes': prediction.yes_votes,
                    'no_votes': prediction.no_votes,
                    'total_votes': prediction.total_votes
                }
            }
            
        except Exception as e:
            logger.error(f"Error casting vote: {str(e)}")
            self.db.rollback()
            raise Exception(f"Failed to cast vote: {str(e)}")

    async def _update_prediction_vote_counts(self, prediction_id: str):
        """Update vote counts on prediction from actual DB counts"""
        try:
            prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
            if not prediction:
                return

            # FIXED: Count actual votes from database
            yes_count = self.db.query(func.count(Vote.id)).filter(
                and_(Vote.prediction_id == prediction_id, Vote.vote == True)
            ).scalar() or 0

            no_count = self.db.query(func.count(Vote.id)).filter(
                and_(Vote.prediction_id == prediction_id, Vote.vote == False)
            ).scalar() or 0

            prediction.yes_votes = yes_count
            prediction.no_votes = no_count
            prediction.total_votes = yes_count + no_count
            prediction.updated_at = self._get_current_utc_time()

            self.db.commit()
            logger.info(f"✅ Recalculated vote counts for prediction {prediction_id}: Yes={yes_count}, No={no_count}, Total={yes_count + no_count}")

        except Exception as e:
            logger.error(f"Error updating vote counts: {str(e)}")
            self.db.rollback()

    async def get_user_votes(
        self, 
        user_id: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get user's votes with predictions"""
        
        try:
            logger.info(f"Getting votes for user {user_id}, limit={limit}, offset={offset}")
            
            votes = (self.db.query(Vote)
                    .options(joinedload(Vote.prediction).joinedload(Prediction.creator))
                    .filter(Vote.user_id == user_id)
                    .order_by(desc(Vote.created_at))
                    .offset(offset)
                    .limit(limit)
                    .all())
            
            logger.info(f"Found {len(votes)} votes for user {user_id}")
            
            formatted_votes = []
            for vote in votes:
                is_resolved = (vote.prediction and 
                             vote.prediction.status == "resolved" and 
                             vote.prediction.resolution is not None)
                
                is_correct = None
                points_earned = vote.points_earned or 0
                
                if is_resolved:
                    is_correct = (vote.vote == vote.prediction.resolution)
                
                created_at_str = vote.created_at.isoformat() if vote.created_at else self._get_current_utc_time().isoformat()
                updated_at_str = vote.updated_at.isoformat() if vote.updated_at else None
                
                vote_data = {
                    'id': str(vote.id),
                    'prediction_id': str(vote.prediction_id),
                    'vote': vote.vote,
                    'confidence': vote.confidence or 75,
                    'points_spent': vote.points_wagered or vote.points_spent or 10,
                    'points_earned': points_earned,
                    'is_resolved': is_resolved,
                    'is_correct': is_correct,
                    'created_at': created_at_str,
                    'updated_at': updated_at_str,
                    'prediction': {
                        'id': str(vote.prediction.id),
                        'title': vote.prediction.title,
                        'description': vote.prediction.description,
                        'status': vote.prediction.status,
                        'closes_at': self._safe_datetime_to_iso(vote.prediction.closes_at),
                        'resolved_at': self._safe_datetime_to_iso(vote.prediction.resolved_at),
                        'resolution': vote.prediction.resolution
                    } if vote.prediction else {
                        'id': str(vote.prediction_id),
                        'title': 'Unknown Prediction',
                        'description': 'Prediction details unavailable',
                        'status': 'unknown',
                        'closes_at': None,
                        'resolved_at': None,
                        'resolution': None
                    }
                }
                formatted_votes.append(vote_data)
                
            logger.info(f"Formatted {len(formatted_votes)} votes for return")
            return formatted_votes

        except Exception as e:
            logger.error(f"Error getting user votes: {str(e)}")
            return []

    def _safe_datetime_to_iso(self, dt):
        """Safely convert datetime to ISO string"""
        if dt is None:
            return None
        try:
            return dt.isoformat()
        except:
            return None

    async def resolve_prediction_votes(self, prediction_id: str, resolution: bool) -> Dict[str, Any]:
        """Resolve all votes for a prediction with 2× base + minority bonus"""
        logger.info(f"Resolving votes for prediction {prediction_id}, resolution={resolution}")
        
        try:
            prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
            if not prediction:
                raise ValueError("Prediction not found")
            
            votes = (self.db.query(Vote)
                    .filter(Vote.prediction_id == prediction_id)
                    .all())
            
            if not votes:
                logger.warning(f"No votes found for prediction {prediction_id}")
                return {
                    'total_votes': 0,
                    'winners': 0,
                    'losers': 0,
                    'total_payout': 0
                }
            
            total_votes = len(votes)
            yes_votes = sum(1 for v in votes if v.vote)
            no_votes = total_votes - yes_votes
            yes_percentage = (yes_votes / total_votes * 100) if total_votes > 0 else 50
            
            logger.info(f"Vote distribution: {yes_votes} YES ({yes_percentage:.1f}%), {no_votes} NO ({100-yes_percentage:.1f}%)")
            
            winners = 0
            losers = 0
            total_payout = 0
            
            for vote in votes:
                if vote.is_resolved:
                    continue
                
                vote.is_resolved = True
                vote.is_correct = (vote.vote == resolution)
                vote.resolved_at = self._get_current_utc_time()
                
                stake = vote.points_wagered or vote.points_spent or 10
                
                if vote.is_correct:
                    base_payout = stake * 2
                    bonus_multiplier = self._calculate_minority_bonus_multiplier(vote.vote, yes_percentage)
                    bonus_payout = int(stake * bonus_multiplier)
                    vote.points_earned = base_payout + bonus_payout
                    
                    user = self.db.query(User).filter(User.id == vote.user_id).first()
                    if user:
                        user.total_points += vote.points_earned
                        user.total_won = (user.total_won or 0) + vote.points_earned
                        user.predictions_correct += 1
                        user.current_streak += 1
                        if user.current_streak > user.longest_streak:
                            user.longest_streak = user.current_streak
                    
                    bonus_text = f" (including {bonus_multiplier}× minority bonus)" if bonus_multiplier > 0 else ""
                    transaction = PointsTransaction(
                        id=str(uuid.uuid4()),
                        user_id=vote.user_id,
                        transaction_type=TransactionType.PREDICTION_WIN.value,
                        amount=vote.points_earned,
                        balance_after=user.total_points if user else 0,
                        prediction_id=prediction_id,
                        description=f"Won {vote.points_earned} points (2× base + {bonus_multiplier}× bonus){bonus_text}",
                        created_at=self._get_current_utc_time()
                    )
                    self.db.add(transaction)
                    
                    winners += 1
                    total_payout += vote.points_earned
                    
                else:
                    vote.points_earned = 0
                    user = self.db.query(User).filter(User.id == vote.user_id).first()
                    if user:
                        user.current_streak = 0
                    
                    losers += 1
            
            self.db.commit()
            
            result = {
                'total_votes': total_votes,
                'yes_votes': yes_votes,
                'no_votes': no_votes,
                'yes_percentage': yes_percentage,
                'winners': winners,
                'losers': losers,
                'total_payout': total_payout,
                'resolution': 'YES' if resolution else 'NO'
            }
            
            logger.info(f"Resolution complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error resolving votes: {str(e)}")
            self.db.rollback()
            raise Exception(f"Failed to resolve votes: {str(e)}")

    async def get_vote_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get voting statistics for user"""
        
        try:
            logger.info(f"Getting vote statistics for user {user_id}")
            
            votes = (self.db.query(Vote)
                    .options(joinedload(Vote.prediction))
                    .filter(Vote.user_id == user_id)
                    .all())
            
            total_votes = len(votes)
            resolved_votes = []
            active_votes = []
            
            for vote in votes:
                if (vote.prediction and 
                    vote.prediction.status == "resolved" and 
                    vote.prediction.resolution is not None):
                    resolved_votes.append(vote)
                else:
                    active_votes.append(vote)
            
            correct_votes = [v for v in resolved_votes 
                           if v.vote == v.prediction.resolution]
            
            total_resolved = len(resolved_votes)
            correct_count = len(correct_votes)
            win_rate = (correct_count / total_resolved * 100) if total_resolved > 0 else 0
            
            total_confidence = sum(v.confidence or 75 for v in votes)
            avg_confidence = (total_confidence / total_votes) if total_votes > 0 else 0
            
            total_points_spent = sum(v.points_wagered or v.points_spent or 10 for v in votes)
            total_points_earned = sum(v.points_earned or 0 for v in votes)
            
            user = self.db.query(User).filter(User.id == user_id).first()
            
            stats = {
                'total_votes': total_votes,
                'active_votes': len(active_votes),
                'resolved_votes': total_resolved,
                'correct_votes': correct_count,
                'accuracy_rate': round(win_rate, 2),
                'win_rate': round(win_rate, 2),
                'average_confidence': round(avg_confidence, 2),
                'current_streak': user.current_streak if user else 0,
                'longest_streak': user.longest_streak if user else 0,
                'total_points_earned': total_points_earned,
                'total_points_spent': total_points_spent
            }
            
            logger.info(f"Generated stats for user {user_id}: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Error getting vote statistics: {str(e)}")
            return {
                'total_votes': 0,
                'active_votes': 0,
                'resolved_votes': 0,
                'correct_votes': 0,
                'accuracy_rate': 0.0,
                'win_rate': 0.0,
                'average_confidence': 0.0,
                'current_streak': 0,
                'longest_streak': 0,
                'total_points_earned': 0,
                'total_points_spent': 0
            }

    async def get_user_vote_for_prediction(self, user_id: str, prediction_id: str) -> Optional[bool]:
        """Get user's vote for a specific prediction"""
        try:
            vote = (self.db.query(Vote)
                   .filter(and_(Vote.user_id == user_id, Vote.prediction_id == prediction_id))
                   .first())
            
            return vote.vote if vote else None
        except Exception as e:
            logger.error(f"Error getting user vote for prediction: {str(e)}")
            return None

    async def update_vote(self, vote_id: str, user_id: str, new_vote: bool, new_confidence: int) -> Dict[str, Any]:
        """Update an existing vote (only allowed on active predictions)"""
        
        vote = self.vote_controller.get_vote_by_id(vote_id)
        if not vote:
            raise ValueError("Vote not found")

        if vote.user_id != user_id:
            raise ValueError("You can only update your own votes")

        if vote.prediction.status != "active":
            raise ValueError("Cannot update vote on closed prediction")

        if vote.prediction.closes_at:
            current_time = self._get_current_utc_time()
            closes_at_normalized = self._normalize_datetime(vote.prediction.closes_at)
            
            if closes_at_normalized and closes_at_normalized <= current_time:
                raise ValueError("Voting has closed for this prediction")

        update_data = {'vote': new_vote, 'confidence': new_confidence}

        try:
            updated_vote = self.vote_controller.update_vote(vote_id, update_data)
            await self._update_prediction_vote_counts(vote.prediction_id)
            
            return {
                'id': str(updated_vote.id),
                'prediction_id': str(updated_vote.prediction_id),
                'vote': updated_vote.vote,
                'confidence': updated_vote.confidence,
                'points_earned': updated_vote.points_earned,
                'created_at': self._safe_datetime_to_iso(updated_vote.created_at),
                'updated_at': self._safe_datetime_to_iso(updated_vote.updated_at)
            }

        except Exception as e:
            logger.error(f"Error updating vote: {str(e)}")
            raise Exception("Failed to update vote")

    async def delete_vote(self, vote_id: str, user_id: str):
        """Delete a vote (only allowed on active predictions)"""
        
        vote = self.vote_controller.get_vote_by_id(vote_id)
        if not vote:
            raise ValueError("Vote not found")

        if vote.user_id != user_id:
            raise ValueError("You can only delete your own votes")

        if vote.prediction.status != "active":
            raise ValueError("Cannot delete vote on closed prediction")

        if vote.prediction.closes_at:
            current_time = self._get_current_utc_time()
            closes_at_normalized = self._normalize_datetime(vote.prediction.closes_at)
            
            if closes_at_normalized and closes_at_normalized <= current_time:
                raise ValueError("Voting has closed for this prediction")

        try:
            prediction_id = vote.prediction_id
            success = self.vote_controller.delete_vote(vote_id, user_id)
            
            if success:
                await self._update_prediction_vote_counts(prediction_id)
                
                # Refund points to user
                user = self.db.query(User).filter(User.id == user_id).first()
                if user and vote.points_wagered:
                    user.total_points += vote.points_wagered
                    self.db.commit()
            
            return success

        except Exception as e:
            logger.error(f"Error deleting vote: {str(e)}")
            raise Exception("Failed to delete vote")