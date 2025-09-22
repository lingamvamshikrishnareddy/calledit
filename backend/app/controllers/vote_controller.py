# app/controllers/vote_controller.py - FIXED: Timezone handling
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from ..models.vote import Vote
from ..models.prediction import Prediction

class VoteController:
    def __init__(self, db: Session):
        self.db = db
    
    def _get_current_utc_time(self):
        """Get current UTC time as timezone-aware datetime"""
        return datetime.now(timezone.utc)
    
    def create_vote(self, vote_data: Dict[str, Any]) -> Vote:
        """Create a new vote"""
        current_time = self._get_current_utc_time()
        
        vote = Vote(
            id=str(uuid.uuid4()),
            user_id=vote_data['user_id'],
            prediction_id=vote_data['prediction_id'],
            vote=vote_data['vote'],
            confidence=vote_data.get('confidence', 75),
            points_wagered=vote_data.get('points_wagered', 10),
            points_spent=vote_data.get('points_spent', 10),
            points_earned=vote_data.get('points_earned', 0),
            is_resolved=vote_data.get('is_resolved', False),
            is_correct=vote_data.get('is_correct', None),
            created_at=current_time,
            updated_at=current_time
        )
        
        self.db.add(vote)
        self.db.commit()
        self.db.refresh(vote)
        
        return vote
    
    def get_vote_by_id(self, vote_id: str) -> Optional[Vote]:
        """Get vote by ID"""
        return (self.db.query(Vote)
                .options(joinedload(Vote.prediction), joinedload(Vote.user))
                .filter(Vote.id == vote_id)
                .first())
    
    def get_user_vote_for_prediction(self, user_id: str, prediction_id: str) -> Optional[Vote]:
        """Get user's vote for a specific prediction"""
        return (self.db.query(Vote)
                .filter(and_(Vote.user_id == user_id, Vote.prediction_id == prediction_id))
                .first())
    
    def get_user_votes(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Vote]:
        """Get all votes by a user"""
        return (self.db.query(Vote)
                .options(joinedload(Vote.prediction))
                .filter(Vote.user_id == user_id)
                .order_by(desc(Vote.created_at))
                .limit(limit)
                .offset(offset)
                .all())
    
    def get_prediction_votes(self, prediction_id: str, limit: int = 100, offset: int = 0) -> List[Vote]:
        """Get all votes for a prediction"""
        return (self.db.query(Vote)
                .options(joinedload(Vote.user))
                .filter(Vote.prediction_id == prediction_id)
                .order_by(desc(Vote.created_at))
                .limit(limit)
                .offset(offset)
                .all())
    
    def update_vote(self, vote_id: str, update_data: Dict[str, Any]) -> Optional[Vote]:
        """Update an existing vote"""
        vote = self.get_vote_by_id(vote_id)
        if not vote:
            return None
        
        allowed_fields = ['vote', 'confidence']
        for field, value in update_data.items():
            if field in allowed_fields:
                setattr(vote, field, value)
        
        vote.updated_at = self._get_current_utc_time()
        self.db.commit()
        self.db.refresh(vote)
        
        return vote
    
    def delete_vote(self, vote_id: str, user_id: str) -> bool:
        """Delete a vote (only by the user who created it)"""
        vote = self.db.query(Vote).filter(
            and_(Vote.id == vote_id, Vote.user_id == user_id)
        ).first()
        
        if not vote:
            return False
        
        self.db.delete(vote)
        self.db.commit()
        
        return True
    
    def get_vote_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user's voting statistics"""
        total_votes = self.db.query(Vote).filter(Vote.user_id == user_id).count()
        
        # Votes on resolved predictions
        resolved_votes = (self.db.query(Vote)
                         .join(Prediction)
                         .filter(and_(Vote.user_id == user_id, Prediction.resolution.isnot(None)))
                         .all())
        
        correct_votes = sum(1 for vote in resolved_votes 
                           if vote.vote == vote.prediction.resolution)
        
        accuracy = (correct_votes / len(resolved_votes) * 100) if resolved_votes else 0
        
        # Average confidence
        avg_confidence = (self.db.query(func.avg(Vote.confidence))
                         .filter(Vote.user_id == user_id)
                         .scalar()) or 0
        
        return {
            'total_votes': total_votes,
            'resolved_votes': len(resolved_votes),
            'correct_votes': correct_votes,
            'accuracy_rate': round(accuracy, 2),
            'average_confidence': round(float(avg_confidence), 2)
        }
    
    def get_vote_distribution_for_prediction(self, prediction_id: str) -> Dict[str, Any]:
        """Get vote distribution for a prediction"""
        votes = self.db.query(Vote).filter(Vote.prediction_id == prediction_id).all()
        
        yes_votes = sum(1 for vote in votes if vote.vote)
        no_votes = sum(1 for vote in votes if not vote.vote)
        total_votes = len(votes)
        
        avg_confidence_yes = sum(vote.confidence for vote in votes if vote.vote) / max(yes_votes, 1)
        avg_confidence_no = sum(vote.confidence for vote in votes if not vote.vote) / max(no_votes, 1)
        
        return {
            'yes_votes': yes_votes,
            'no_votes': no_votes,
            'total_votes': total_votes,
            'yes_percentage': (yes_votes / max(total_votes, 1)) * 100,
            'no_percentage': (no_votes / max(total_votes, 1)) * 100,
            'avg_confidence_yes': round(avg_confidence_yes, 2),
            'avg_confidence_no': round(avg_confidence_no, 2)
        }
    
    def update_vote_points(self, vote_id: str, points: int) -> Optional[Vote]:
        """Update points earned for a vote"""
        vote = self.get_vote_by_id(vote_id)
        if not vote:
            return None
        
        vote.points_earned = points
        vote.updated_at = self._get_current_utc_time()
        
        self.db.commit()
        self.db.refresh(vote)
        
        return vote
    
    def get_recent_votes(self, limit: int = 20) -> List[Vote]:
        """Get recent votes across all predictions"""
        return (self.db.query(Vote)
                .options(joinedload(Vote.user), joinedload(Vote.prediction))
                .order_by(desc(Vote.created_at))
                .limit(limit)
                .all())
    
    def check_user_can_vote(self, user_id: str, prediction_id: str) -> Dict[str, Any]:
        """Check if user can vote on a prediction"""
        # Check if user already voted
        existing_vote = self.get_user_vote_for_prediction(user_id, prediction_id)
        if existing_vote:
            return {
                'can_vote': False,
                'reason': 'already_voted',
                'existing_vote': existing_vote
            }
        
        # Check if prediction is still active
        prediction = (self.db.query(Prediction)
                     .filter(Prediction.id == prediction_id)
                     .first())
        
        if not prediction:
            return {
                'can_vote': False,
                'reason': 'prediction_not_found'
            }
        
        # FIXED: Timezone-aware comparison
        current_time = self._get_current_utc_time()
        if prediction.closes_at:
            # Normalize the closes_at time for comparison
            closes_at = prediction.closes_at
            if closes_at.tzinfo is None:
                closes_at = closes_at.replace(tzinfo=timezone.utc)
            else:
                closes_at = closes_at.astimezone(timezone.utc)
            
            if closes_at <= current_time:
                return {
                    'can_vote': False,
                    'reason': 'prediction_closed'
                }
        
        if prediction.status != 'active':
            return {
                'can_vote': False,
                'reason': 'prediction_not_active'
            }
        
        return {
            'can_vote': True,
            'prediction': prediction
        }