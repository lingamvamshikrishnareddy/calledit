# app/services/prediction_service.py - FIXED: Removed .value access on status field
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
import logging

from ..controllers.prediction_controller import PredictionController
from ..controllers.category_controller import CategoryController
from ..models.prediction import Prediction, PredictionStatus
from ..models.user import User

logger = logging.getLogger(__name__)

class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.prediction_controller = PredictionController(db)
        self.category_controller = CategoryController(db)

    async def get_predictions(
        self, 
        user_id: str,
        category: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get predictions with user votes included"""
        try:
            # FIXED: Map frontend status to backend status
            backend_status = self._map_frontend_status(status)
            
            logger.info(f"Getting predictions for user {user_id} with status: {status} -> {backend_status}")
            
            # Get predictions with user votes
            predictions_with_votes = self.prediction_controller.get_predictions_with_user_votes(
                user_id=user_id,
                limit=limit,
                offset=offset
            )
            
            # FIXED: Apply filters after getting data if needed
            if backend_status:
                predictions_with_votes = [
                    p for p in predictions_with_votes 
                    if p['prediction'].status == backend_status  # REMOVED .value access
                ]
            
            if category:
                predictions_with_votes = [
                    p for p in predictions_with_votes 
                    if p['prediction'].category_id == category
                ]
            
            # Format for frontend
            formatted_predictions = []
            for item in predictions_with_votes:
                prediction = item['prediction']
                user_vote = item['user_vote']
                
                formatted_pred = await self._format_prediction_for_frontend(prediction, user_vote)
                formatted_predictions.append(formatted_pred)
            
            logger.info(f"Returning {len(formatted_predictions)} predictions")
            return formatted_predictions
            
        except Exception as e:
            logger.error(f"Error getting predictions: {str(e)}")
            raise

    async def get_prediction_by_id(self, prediction_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get single prediction with user vote"""
        try:
            prediction = self.prediction_controller.get_prediction_by_id(prediction_id)
            if not prediction:
                return None
            
            # Get user's vote for this prediction
            user_vote = self.prediction_controller.get_user_vote_for_prediction(prediction_id, user_id)
            
            return await self._format_prediction_for_frontend(prediction, user_vote)
            
        except Exception as e:
            logger.error(f"Error getting prediction {prediction_id}: {str(e)}")
            raise

    async def create_prediction(self, prediction_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        """Create new prediction"""
        try:
            # Validate category exists
            category = await self.category_controller.get_category_by_id(prediction_data['category_id'])
            if not category:
                raise ValueError(f"Category {prediction_data['category_id']} not found")
            
            # Add creator to data
            prediction_data['created_by'] = created_by
            
            # Create prediction
            prediction = self.prediction_controller.create_prediction(prediction_data)
            
            # Format for frontend
            return await self._format_prediction_for_frontend(prediction, None)
            
        except Exception as e:
            logger.error(f"Error creating prediction: {str(e)}")
            raise

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all categories with prediction counts"""
        try:
            categories = self.category_controller.get_all_categories()
            
            formatted_categories = []
            for category in categories:
                # Count predictions in this category
                prediction_count = self.prediction_controller.count_predictions_by_category(category.id)
                
                formatted_cat = {
                    'id': category.id,
                    'name': category.name,
                    'slug': category.slug,
                    'description': getattr(category, 'description', None),
                    'icon_name': getattr(category, 'icon_name', 'help-circle'),
                    'color': getattr(category, 'color', '#6B7280'),
                    'prediction_count': prediction_count,
                    'created_at': category.created_at.isoformat() if hasattr(category, 'created_at') else None,
                }
                formatted_categories.append(formatted_cat)
            
            return formatted_categories
            
        except Exception as e:
            logger.error(f"Error getting categories: {str(e)}")
            raise

    async def get_trending_predictions(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending predictions"""
        try:
            predictions = self.prediction_controller.get_trending_predictions(limit)
            
            formatted_predictions = []
            for prediction in predictions:
                # Get user vote
                user_vote = self.prediction_controller.get_user_vote_for_prediction(prediction.id, user_id)
                formatted_pred = await self._format_prediction_for_frontend(prediction, user_vote)
                formatted_predictions.append(formatted_pred)
            
            return formatted_predictions
            
        except Exception as e:
            logger.error(f"Error getting trending predictions: {str(e)}")
            raise

    async def get_user_predictions(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Get predictions created by user"""
        try:
            predictions = self.prediction_controller.get_user_predictions(user_id, limit, offset)
            
            formatted_predictions = []
            for prediction in predictions:
                formatted_pred = await self._format_prediction_for_frontend(prediction, None)
                formatted_predictions.append(formatted_pred)
            
            return formatted_predictions
            
        except Exception as e:
            logger.error(f"Error getting user predictions: {str(e)}")
            raise

    async def update_prediction(self, prediction_id: str, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update prediction (only by creator)"""
        try:
            prediction = self.prediction_controller.get_prediction_by_id(prediction_id)
            if not prediction:
                return None
            
            if str(prediction.created_by) != str(user_id):
                raise ValueError("Only the creator can update this prediction")
            
            updated_prediction = self.prediction_controller.update_prediction(prediction_id, update_data)
            if not updated_prediction:
                return None
            
            return await self._format_prediction_for_frontend(updated_prediction, None)
            
        except Exception as e:
            logger.error(f"Error updating prediction {prediction_id}: {str(e)}")
            raise

    async def delete_prediction(self, prediction_id: str, user_id: str) -> bool:
        """Delete prediction (only by creator, only if no votes)"""
        try:
            prediction = self.prediction_controller.get_prediction_by_id(prediction_id)
            if not prediction:
                return False
            
            if str(prediction.created_by) != str(user_id):
                raise ValueError("Only the creator can delete this prediction")
            
            return self.prediction_controller.delete_prediction(prediction_id)
            
        except Exception as e:
            logger.error(f"Error deleting prediction {prediction_id}: {str(e)}")
            raise

    async def close_prediction(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        """Close prediction (admin only)"""
        try:
            prediction = self.prediction_controller.close_prediction(prediction_id)
            if not prediction:
                return None
            
            return await self._format_prediction_for_frontend(prediction, None)
            
        except Exception as e:
            logger.error(f"Error closing prediction {prediction_id}: {str(e)}")
            raise

    async def resolve_prediction(self, prediction_id: str, resolution: bool, resolution_notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Resolve prediction with outcome (admin only)"""
        try:
            prediction = self.prediction_controller.resolve_prediction(prediction_id, resolution)
            if not prediction:
                return None
            
            return await self._format_prediction_for_frontend(prediction, None)
            
        except Exception as e:
            logger.error(f"Error resolving prediction {prediction_id}: {str(e)}")
            raise

    async def close_expired_predictions(self) -> int:
        """Close all expired predictions"""
        try:
            return self.prediction_controller.close_expired_predictions()
        except Exception as e:
            logger.error(f"Error closing expired predictions: {str(e)}")
            raise

    def _map_frontend_status(self, frontend_status: Optional[str]) -> Optional[str]:
        """Map frontend status values to backend enum values"""
        if not frontend_status:
            return None
        
        # FIXED: Map frontend status to backend PredictionStatus enum values
        status_mapping = {
            'active': 'active',
            'open': 'active',  # Treat 'open' as 'active'
            'closed': 'closed',
            'resolved': 'resolved',
            'cancelled': 'cancelled'
        }
        
        return status_mapping.get(frontend_status.lower(), frontend_status)

    async def _format_prediction_for_frontend(self, prediction: Prediction, user_vote: Optional[bool]) -> Dict[str, Any]:
        """Format prediction object for frontend consumption"""
        try:
            # FIXED: Safe attribute access with fallbacks
            category_data = None
            if hasattr(prediction, 'category') and prediction.category:
                category_data = {
                    'id': prediction.category.id,
                    'name': prediction.category.name,
                    'color': getattr(prediction.category, 'color', '#6B7280'),
                    'icon_name': getattr(prediction.category, 'icon_name', 'help-circle')
                }

            creator_data = None
            if hasattr(prediction, 'creator') and prediction.creator:
                creator_data = {
                    'id': str(prediction.creator.id),
                    'username': prediction.creator.username,
                    'display_name': prediction.creator.display_name,
                    'avatar_url': getattr(prediction.creator, 'avatar_url', None)
                }

            # FIXED: Convert datetime objects to ISO strings
            closes_at_iso = None
            if prediction.closes_at:
                if hasattr(prediction.closes_at, 'isoformat'):
                    closes_at_iso = prediction.closes_at.isoformat()
                else:
                    closes_at_iso = str(prediction.closes_at)

            created_at_iso = None
            if prediction.created_at:
                if hasattr(prediction.created_at, 'isoformat'):
                    created_at_iso = prediction.created_at.isoformat()
                else:
                    created_at_iso = str(prediction.created_at)

            # FIXED: Ensure vote counts are integers
            yes_votes = max(0, prediction.yes_votes or 0)
            no_votes = max(0, prediction.no_votes or 0)
            total_votes = yes_votes + no_votes

            # CRITICAL FIX: Handle status field properly - don't access .value on strings
            status_value = prediction.status
            if hasattr(prediction.status, 'value'):
                status_value = prediction.status.value
            elif isinstance(prediction.status, str):
                status_value = prediction.status
            else:
                status_value = str(prediction.status)

            return {
                'id': str(prediction.id),
                'title': prediction.title,
                'description': prediction.description,
                'category': category_data,
                'creator': creator_data,
                'status': status_value,  # FIXED: Safe status access
                'yes_votes': yes_votes,
                'no_votes': no_votes,
                'total_votes': total_votes,
                'points_awarded': getattr(prediction, 'points_awarded', 100) or 100,
                'closes_at': closes_at_iso,
                'created_at': created_at_iso,
                'user_vote': user_vote,
                'resolution': getattr(prediction, 'resolution', None),
                'resolved_at': getattr(prediction, 'resolved_at', None)
            }
            
        except Exception as e:
            logger.error(f"Error formatting prediction {prediction.id}: {str(e)}")
            # Return basic structure to prevent total failure
            return {
                'id': str(prediction.id),
                'title': prediction.title or 'Unknown Title',
                'description': prediction.description,
                'category': {'id': 'other', 'name': 'Other', 'color': '#6B7280'},
                'creator': {'id': 'unknown', 'username': 'Unknown', 'display_name': 'Unknown User'},
                'status': 'active',
                'yes_votes': 0,
                'no_votes': 0,
                'total_votes': 0,
                'points_awarded': 100,
                'closes_at': None,
                'created_at': None,
                'user_vote': user_vote,
                'resolution': None
            }