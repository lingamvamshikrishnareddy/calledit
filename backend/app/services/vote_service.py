# app/services/vote_service.py - FIXED: Vote service for business logic
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, List, Any
from datetime import datetime
import uuid

from ..controllers.vote_controller import VoteController
from ..models.vote import Vote
from ..models.prediction import Prediction
from ..models.user import User

class VoteService:
    def __init__(self, db: Session):
        self.db = db
        self.vote_controller = VoteController(db)

    async def cast_vote(
        self, 
        user_id: str, 
        prediction_id: str, 
        vote: bool, 
        confidence: int = 50
    ) -> Dict[str, Any]:
        """
        Cast a vote on a prediction
        """
        # Validate that prediction exists and is active
        prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if not prediction:
            raise ValueError("Prediction not found")

        # Check if prediction is still open for voting
        if prediction.status != "active":
            raise ValueError("This prediction is no longer accepting votes")

        if prediction.closes_at <= datetime.utcnow():
            raise ValueError("Voting has closed for this prediction")

        # Check if user already voted on this prediction
        existing_vote = self.vote_controller.get_user_vote_for_prediction(user_id, prediction_id)
        if existing_vote:
            raise ValueError("You have already voted on this prediction")

        # Validate confidence level
        if confidence < 1 or confidence > 100:
            raise ValueError("Confidence must be between 1 and 100")

        # Create the vote
        vote_data = {
            'user_id': user_id,
            'prediction_id': prediction_id,
            'vote': vote,
            'confidence': confidence
        }

        try:
            # Create vote in database
            new_vote = self.vote_controller.create_vote(vote_data)
            
            # Update prediction vote counts
            await self._update_prediction_vote_counts(prediction_id)
            
            # Return formatted vote response
            return {
                'id': str(new_vote.id),
                'prediction_id': str(new_vote.prediction_id),
                'vote': new_vote.vote,
                'confidence': new_vote.confidence,
                'points_earned': new_vote.points_earned,
                'created_at': new_vote.voted_at.isoformat() if new_vote.voted_at else datetime.utcnow().isoformat(),
                'updated_at': new_vote.updated_at.isoformat() if new_vote.updated_at else None
            }

        except Exception as e:
            print(f"❌ Error creating vote: {str(e)}")
            self.db.rollback()
            raise Exception("Failed to cast vote")

    async def _update_prediction_vote_counts(self, prediction_id: str):
        """
        Update vote counts on prediction
        """
        try:
            prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
            if not prediction:
                return

            # Count yes and no votes
            yes_count = self.db.query(Vote).filter(
                and_(Vote.prediction_id == prediction_id, Vote.vote == True)
            ).count()

            no_count = self.db.query(Vote).filter(
                and_(Vote.prediction_id == prediction_id, Vote.vote == False)
            ).count()

            # Update prediction
            prediction.yes_votes = yes_count
            prediction.no_votes = no_count
            prediction.total_votes = yes_count + no_count
            prediction.updated_at = datetime.utcnow()

            self.db.commit()
            print(f"✅ Updated vote counts for prediction {prediction_id}: Yes={yes_count}, No={no_count}")

        except Exception as e:
            print(f"❌ Error updating vote counts: {str(e)}")
            self.db.rollback()

    async def get_user_votes(
        self, 
        user_id: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get user's votes with predictions
        """
        try:
            votes = self.vote_controller.get_user_votes(user_id, limit, offset)
            
            formatted_votes = []
            for vote in votes:
                vote_data = {
                    'id': str(vote.id),
                    'prediction_id': str(vote.prediction_id),
                    'vote': vote.vote,
                    'confidence': vote.confidence,
                    'points_earned': vote.points_earned,
                    'created_at': vote.voted_at.isoformat() if vote.voted_at else None,
                    'updated_at': vote.updated_at.isoformat() if vote.updated_at else None,
                    'prediction': {
                        'title': vote.prediction.title,
                        'status': vote.prediction.status,
                        'closes_at': vote.prediction.closes_at.isoformat() if vote.prediction.closes_at else None,
                        'resolution': vote.prediction.resolution
                    } if vote.prediction else None
                }
                formatted_votes.append(vote_data)
                
            return formatted_votes

        except Exception as e:
            print(f"❌ Error getting user votes: {str(e)}")
            return []

    async def get_vote_statistics(self, user_id: str) -> Dict[str, Any]:
        """
        Get voting statistics for user
        """
        try:
            stats = self.vote_controller.get_vote_statistics(user_id)
            
            # Add additional calculated stats
            stats.update({
                'current_streak': 0,  # TODO: Implement streak calculation
                'longest_streak': 0,  # TODO: Implement streak calculation
                'total_points_earned': 0  # TODO: Sum points from all votes
            })
            
            return stats

        except Exception as e:
            print(f"❌ Error getting vote statistics: {str(e)}")
            return {
                'total_votes': 0,
                'correct_votes': 0,
                'accuracy_rate': 0.0,
                'average_confidence': 0.0,
                'total_points_earned': 0,
                'current_streak': 0,
                'longest_streak': 0
            }

    async def update_vote(
        self, 
        vote_id: str, 
        user_id: str, 
        new_vote: bool, 
        new_confidence: int
    ) -> Dict[str, Any]:
        """
        Update an existing vote (only allowed on active predictions)
        """
        # Get the vote and check ownership
        vote = self.vote_controller.get_vote_by_id(vote_id)
        if not vote:
            raise ValueError("Vote not found")

        if vote.user_id != user_id:
            raise ValueError("You can only update your own votes")

        # Check if prediction is still active
        if vote.prediction.status != "active":
            raise ValueError("Cannot update vote on closed prediction")

        if vote.prediction.closes_at <= datetime.utcnow():
            raise ValueError("Voting has closed for this prediction")

        # Update the vote
        update_data = {
            'vote': new_vote,
            'confidence': new_confidence
        }

        try:
            updated_vote = self.vote_controller.update_vote(vote_id, update_data)
            
            # Update prediction vote counts
            await self._update_prediction_vote_counts(vote.prediction_id)
            
            return {
                'id': str(updated_vote.id),
                'prediction_id': str(updated_vote.prediction_id),
                'vote': updated_vote.vote,
                'confidence': updated_vote.confidence,
                'points_earned': updated_vote.points_earned,
                'created_at': updated_vote.voted_at.isoformat() if updated_vote.voted_at else None,
                'updated_at': updated_vote.updated_at.isoformat() if updated_vote.updated_at else None
            }

        except Exception as e:
            print(f"❌ Error updating vote: {str(e)}")
            raise Exception("Failed to update vote")

    async def delete_vote(self, vote_id: str, user_id: str):
        """
        Delete a vote (only allowed on active predictions)
        """
        # Get the vote and check ownership
        vote = self.vote_controller.get_vote_by_id(vote_id)
        if not vote:
            raise ValueError("Vote not found")

        if vote.user_id != user_id:
            raise ValueError("You can only delete your own votes")

        # Check if prediction is still active
        if vote.prediction.status != "active":
            raise ValueError("Cannot delete vote on closed prediction")

        if vote.prediction.closes_at <= datetime.utcnow():
            raise ValueError("Voting has closed for this prediction")

        try:
            prediction_id = vote.prediction_id
            success = self.vote_controller.delete_vote(vote_id, user_id)
            
            if success:
                # Update prediction vote counts
                await self._update_prediction_vote_counts(prediction_id)
            
            return success

        except Exception as e:
            print(f"❌ Error deleting vote: {str(e)}")
            raise Exception("Failed to delete vote")

    async def get_prediction_votes(
        self, 
        prediction_id: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get all votes for a specific prediction
        """
        try:
            votes = self.vote_controller.get_prediction_votes(prediction_id, limit, offset)
            distribution = self.vote_controller.get_vote_distribution_for_prediction(prediction_id)
            
            formatted_votes = []
            for vote in votes:
                vote_data = {
                    'id': str(vote.id),
                    'vote': vote.vote,
                    'confidence': vote.confidence,
                    'created_at': vote.voted_at.isoformat() if vote.voted_at else None,
                    'user': {
                        'username': vote.user.username,
                        'display_name': vote.user.display_name
                    } if vote.user else None
                }
                formatted_votes.append(vote_data)
            
            return {
                'votes': formatted_votes,
                'distribution': distribution,
                'average_confidence': {
                    'yes': distribution.get('avg_confidence_yes', 0),
                    'no': distribution.get('avg_confidence_no', 0)
                }
            }

        except Exception as e:
            print(f"❌ Error getting prediction votes: {str(e)}")
            return {
                'votes': [],
                'distribution': {},
                'average_confidence': {'yes': 0, 'no': 0}
            }

    async def bulk_resolve_prediction_votes(
        self, 
        prediction_id: str, 
        resolution: bool
    ) -> Dict[str, Any]:
        """
        Resolve all votes for a prediction when outcome is determined
        """
        try:
            # Update prediction with resolution
            prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
            if not prediction:
                raise ValueError("Prediction not found")

            prediction.resolution = resolution
            prediction.status = "resolved"
            prediction.resolved_at = datetime.utcnow()

            # Get all votes for this prediction
            votes = self.db.query(Vote).filter(Vote.prediction_id == prediction_id).all()

            resolved_count = 0
            total_points_awarded = 0

            for vote in votes:
                # Check if vote was correct
                vote.is_correct = (vote.vote == resolution)
                
                # Award points based on correctness and confidence
                if vote.is_correct:
                    base_points = 10
                    confidence_bonus = int(vote.confidence * 0.1)
                    vote.points_earned = base_points + confidence_bonus
                else:
                    vote.points_earned = 0

                total_points_awarded += vote.points_earned
                resolved_count += 1

            self.db.commit()

            return {
                'prediction_id': prediction_id,
                'resolution': resolution,
                'votes_resolved': resolved_count,
                'total_points_awarded': total_points_awarded
            }

        except Exception as e:
            print(f"❌ Error resolving prediction votes: {str(e)}")
            self.db.rollback()
            raise Exception("Failed to resolve prediction votes")