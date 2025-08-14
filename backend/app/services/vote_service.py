# app/services/vote_service.py
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..controllers.vote_controller import VoteController
from ..controllers.prediction_controller import PredictionController
from ..controllers.user_controller import UserController

class VoteService:
    def __init__(self, db: Session):
        self.db = db
        self.vote_controller = VoteController(db)
        self.prediction_controller = PredictionController(db)
        self.user_controller = UserController(db)
    
    def calculate_vote_points(self, prediction_data: Dict, vote: bool, confidence: int) -> int:
        """Calculate points for a vote based on confidence and crowd dynamics"""
        base_points = 10
        confidence_multiplier = confidence / 50  # 0.02 to 2.0
        
        # Get current vote distribution
        total_votes = (prediction_data.get('yes_votes', 0) + 
                      prediction_data.get('no_votes', 0))
        
        # Minority bonus: betting against the crowd gives more points
        minority_bonus = 1.0
        if total_votes > 0:
            yes_percentage = prediction_data.get('yes_votes', 0) / total_votes
            no_percentage = 1 - yes_percentage
            
            # Award bonus if betting on the less popular side
            if vote and yes_percentage < 0.5:  # Betting YES when YES is minority
                minority_bonus = 1.2
            elif not vote and no_percentage < 0.5:  # Betting NO when NO is minority
                minority_bonus = 1.2
        
        return round(base_points * confidence_multiplier * minority_bonus)
    
    async def cast_vote(self, user_id: str, prediction_id: str, vote: bool, confidence: int = 50) -> Dict[str, Any]:
        """Cast a vote on a prediction"""
        # Validate confidence level
        if confidence < 1 or confidence > 100:
            raise ValueError("Confidence must be between 1 and 100")
        
        # Check if user can vote
        can_vote_result = self.vote_controller.check_user_can_vote(user_id, prediction_id)
        if not can_vote_result['can_vote']:
            raise ValueError(f"Cannot vote: {can_vote_result['reason']}")
        
        # Get prediction data for points calculation
        prediction = can_vote_result.get('prediction')
        if not prediction:
            raise ValueError("Prediction not found")
        
        # Calculate points before creating vote (to avoid affecting the calculation)
        prediction_data = {
            'yes_votes': prediction.yes_votes or 0,
            'no_votes': prediction.no_votes or 0
        }
        points_earned = self.calculate_vote_points(prediction_data, vote, confidence)
        
        # Create vote
        vote_data = {
            'user_id': user_id,
            'prediction_id': prediction_id,
            'vote': vote,
            'confidence': confidence,
            'points_earned': points_earned
        }
        
        created_vote = self.vote_controller.create_vote(vote_data)
        
        # Update prediction vote counts
        self.prediction_controller.update_vote_counts(prediction_id, vote, increment=1)
        
        # Update user stats
        self.user_controller.increment_user_stats(user_id, predictions_made=1)
        
        return self._format_vote_response(created_vote)
    
    async def update_vote(self, vote_id: str, user_id: str, new_vote: bool, new_confidence: int) -> Dict[str, Any]:
        """Update an existing vote"""
        if new_confidence < 1 or new_confidence > 100:
            raise ValueError("Confidence must be between 1 and 100")
            
        existing_vote = self.vote_controller.get_vote_by_id(vote_id)
        if not existing_vote:
            raise ValueError("Vote not found")
        
        if str(existing_vote.user_id) != user_id:
            raise ValueError("Not authorized to update this vote")
        
        # Check if prediction is still active
        can_vote_result = self.vote_controller.check_user_can_vote(user_id, str(existing_vote.prediction_id))
        prediction = can_vote_result.get('prediction')
        if not prediction or prediction.status != 'active':
            raise ValueError("Cannot update vote on inactive prediction")
        
        # Calculate new points
        prediction_data = {
            'yes_votes': prediction.yes_votes or 0,
            'no_votes': prediction.no_votes or 0
        }
        new_points = self.calculate_vote_points(prediction_data, new_vote, new_confidence)
        
        # Update vote counts if vote changed
        if existing_vote.vote != new_vote:
            # Remove old vote count
            self.prediction_controller.update_vote_counts(
                str(existing_vote.prediction_id), 
                existing_vote.vote, 
                increment=-1
            )
            # Add new vote count
            self.prediction_controller.update_vote_counts(
                str(existing_vote.prediction_id), 
                new_vote, 
                increment=1
            )
        
        # Update vote
        update_data = {
            'vote': new_vote, 
            'confidence': new_confidence,
            'points_earned': new_points,
            'updated_at': datetime.utcnow()
        }
        updated_vote = self.vote_controller.update_vote(vote_id, update_data)
        
        return self._format_vote_response(updated_vote)
    
    async def delete_vote(self, vote_id: str, user_id: str) -> None:
        """Delete a vote"""
        existing_vote = self.vote_controller.get_vote_by_id(vote_id)
        if not existing_vote:
            raise ValueError("Vote not found")
        
        if str(existing_vote.user_id) != user_id:
            raise ValueError("Not authorized to delete this vote")
        
        # Check if prediction is still active (only allow deletion on active predictions)
        can_vote_result = self.vote_controller.check_user_can_vote(user_id, str(existing_vote.prediction_id))
        prediction = can_vote_result.get('prediction')
        if not prediction or prediction.status != 'active':
            raise ValueError("Cannot delete vote on inactive prediction")
        
        # Update prediction vote counts
        self.prediction_controller.update_vote_counts(
            str(existing_vote.prediction_id), 
            existing_vote.vote, 
            increment=-1
        )
        
        # Update user stats
        self.user_controller.increment_user_stats(user_id, predictions_made=-1)
        
        # Delete vote
        success = self.vote_controller.delete_vote(vote_id, user_id)
        if not success:
            raise ValueError("Failed to delete vote")
    
    async def get_user_votes(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's votes with pagination"""
        votes = self.vote_controller.get_user_votes(user_id, limit, offset)
        return [self._format_vote_with_prediction(vote) for vote in votes]
    
    async def get_vote_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user voting statistics"""
        stats = self.vote_controller.get_vote_statistics(user_id)
        
        # Calculate additional metrics
        total_votes = stats.get('total_votes', 0)
        correct_votes = stats.get('correct_votes', 0)
        
        accuracy_rate = (correct_votes / total_votes * 100) if total_votes > 0 else 0
        
        return {
            **stats,
            'accuracy_rate': round(accuracy_rate, 2),
            'average_confidence': stats.get('average_confidence', 50),
            'total_points_earned': stats.get('total_points_earned', 0),
            'current_streak': stats.get('current_streak', 0),
            'longest_streak': stats.get('longest_streak', 0)
        }
    
    async def get_prediction_votes(self, prediction_id: str, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get all votes for a specific prediction"""
        votes = self.vote_controller.get_prediction_votes(prediction_id, limit, offset)
        
        # Calculate distribution
        yes_votes = sum(1 for vote in votes if vote.vote)
        no_votes = len(votes) - yes_votes
        total_votes = len(votes)
        
        yes_percentage = (yes_votes / total_votes * 100) if total_votes > 0 else 50
        no_percentage = 100 - yes_percentage
        
        return {
            'votes': [self._format_vote_response(vote) for vote in votes],
            'distribution': {
                'yes_votes': yes_votes,
                'no_votes': no_votes,
                'total_votes': total_votes,
                'yes_percentage': round(yes_percentage, 1),
                'no_percentage': round(no_percentage, 1)
            },
            'average_confidence': {
                'overall': sum(vote.confidence for vote in votes) / total_votes if total_votes > 0 else 0,
                'yes_voters': sum(vote.confidence for vote in votes if vote.vote) / yes_votes if yes_votes > 0 else 0,
                'no_voters': sum(vote.confidence for vote in votes if not vote.vote) / no_votes if no_votes > 0 else 0
            }
        }
    
    def _format_vote_response(self, vote) -> Dict[str, Any]:
        """Format vote for API response"""
        return {
            "id": str(vote.id),
            "prediction_id": str(vote.prediction_id),
            "vote": vote.vote,
            "confidence": vote.confidence,
            "points_earned": vote.points_earned or 0,
            "created_at": vote.created_at.isoformat(),
            "updated_at": vote.updated_at.isoformat() if vote.updated_at else None
        }
    
    def _format_vote_with_prediction(self, vote) -> Dict[str, Any]:
        """Format vote with prediction details"""
        response = self._format_vote_response(vote)
        
        if hasattr(vote, 'prediction') and vote.prediction:
            response["prediction"] = {
                "id": str(vote.prediction.id),
                "title": vote.prediction.title,
                "description": vote.prediction.description,
                "status": vote.prediction.status.value if hasattr(vote.prediction.status, 'value') else str(vote.prediction.status),
                "closes_at": vote.prediction.closes_at.isoformat(),
                "resolution": vote.prediction.resolution,
                "category": vote.prediction.category,
                "creator_username": vote.prediction.creator.username if hasattr(vote.prediction, 'creator') and vote.prediction.creator else None
            }
        
        return response
    
    async def bulk_resolve_prediction_votes(self, prediction_id: str, resolution: bool) -> Dict[str, Any]:
        """Resolve all votes for a prediction and calculate final points"""
        votes = self.vote_controller.get_prediction_votes(prediction_id)
        
        total_votes = len(votes)
        correct_votes = 0
        total_points_awarded = 0
        
        for vote in votes:
            is_correct = vote.vote == resolution
            if is_correct:
                correct_votes += 1
                # Award the points they staked
                final_points = vote.points_earned or 0
                total_points_awarded += final_points
                
                # Update user's total points
                self.user_controller.add_points_to_user(str(vote.user_id), final_points)
                
                # Update user accuracy stats
                self.user_controller.increment_user_stats(
                    str(vote.user_id), 
                    predictions_correct=1
                )
        
        return {
            'prediction_id': prediction_id,
            'total_votes': total_votes,
            'correct_votes': correct_votes,
            'accuracy_rate': (correct_votes / total_votes * 100) if total_votes > 0 else 0,
            'total_points_awarded': total_points_awarded,
            'resolution': resolution
        }