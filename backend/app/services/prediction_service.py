# app/services/prediction_service.py
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..controllers.prediction_controller import PredictionController
from ..controllers.category_controller import CategoryController
from ..controllers.vote_controller import VoteController

class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.prediction_controller = PredictionController(db)
        self.category_controller = CategoryController(db)
        self.vote_controller = VoteController(db)
    
    async def create_prediction(self, prediction_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new prediction"""
        # Validate category exists
        category = self.category_controller.get_category_by_id(prediction_data['category_id'])
        if not category:
            raise ValueError("Category not found")
        
        # Validate closes_at is in the future
        if prediction_data['closes_at'] <= datetime.utcnow():
            raise ValueError("Prediction must close in the future")
        
        # Add creator ID to prediction data
        prediction_data['created_by'] = user_id
        
        # Create prediction
        prediction = self.prediction_controller.create_prediction(prediction_data)
        
        return self._format_prediction_response(prediction)
    
    async def get_predictions(
        self,
        user_id: str,
        category: Optional[str] = None,
        status: Optional[str] = "active",
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get predictions with user vote information"""
        predictions_with_votes = self.prediction_controller.get_predictions_with_user_votes(
            user_id, limit, offset
        )
        
        return [
            self._format_prediction_with_vote(item['prediction'], item['user_vote'])
            for item in predictions_with_votes
        ]
    
    async def get_prediction_by_id(self, prediction_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get single prediction with user vote"""
        prediction = self.prediction_controller.get_prediction_by_id(prediction_id)
        if not prediction:
            return None
        
        # Get user's vote for this prediction
        user_vote = self.vote_controller.get_user_vote_for_prediction(user_id, prediction_id)
        
        return self._format_prediction_with_vote(prediction, user_vote.vote if user_vote else None)
    
    async def get_trending_predictions(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending predictions"""
        predictions = self.prediction_controller.get_trending_predictions(limit)
        
        result = []
        for prediction in predictions:
            user_vote = self.vote_controller.get_user_vote_for_prediction(user_id, str(prediction.id))
            result.append(
                self._format_prediction_with_vote(prediction, user_vote.vote if user_vote else None)
            )
        
        return result
    
    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all active categories with stats"""
        return self.category_controller.get_categories_with_stats()
    
    async def close_expired_predictions(self) -> int:
        """Close predictions that have passed their closing time"""
        # This would typically be called by a background task
        expired_predictions = self.prediction_controller.get_predictions(
            status="active",
            limit=1000  # Process in batches
        )
        
        closed_count = 0
        for prediction in expired_predictions:
            if prediction.closes_at <= datetime.utcnow():
                self.prediction_controller.close_prediction(str(prediction.id))
                closed_count += 1
        
        return closed_count
    
    def _format_prediction_response(self, prediction) -> Dict[str, Any]:
        """Format prediction for API response"""
        return {
            "id": str(prediction.id),
            "title": prediction.title,
            "description": prediction.description,
            "category": {
                "id": str(prediction.category.id),
                "name": prediction.category.name,
                "slug": prediction.category.slug,
                "color": prediction.category.color,
                "icon_name": prediction.category.icon_name
            },
            "creator": {
                "id": str(prediction.creator.id),
                "username": prediction.creator.username,
                "display_name": prediction.creator.display_name,
                "avatar_url": prediction.creator.avatar_url
            },
            "status": prediction.status.value,
            "yes_votes": prediction.yes_votes,
            "no_votes": prediction.no_votes,
            "total_votes": prediction.total_votes,
            "points_awarded": prediction.points_awarded,
            "closes_at": prediction.closes_at.isoformat(),
            "created_at": prediction.created_at.isoformat()
        }
    
    def _format_prediction_with_vote(self, prediction, user_vote: Optional[bool]) -> Dict[str, Any]:
        """Format prediction with user vote information"""
        response = self._format_prediction_response(prediction)
        response["user_vote"] = user_vote
        return response