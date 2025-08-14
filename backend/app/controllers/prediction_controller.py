# app/controllers/prediction_controller.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, and_, or_, func
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from ..models.prediction import Prediction, PredictionStatus
from ..models.user import User
from ..models.vote import Vote

class PredictionController:
    def __init__(self, db: Session):
        self.db = db
    
    def create_prediction(self, prediction_data: Dict[str, Any]) -> Prediction:
        """Create a new prediction"""
        prediction = Prediction(
            id=uuid.uuid4(),
            title=prediction_data['title'],
            description=prediction_data.get('description'),
            category_id=prediction_data['category_id'],
            created_by=prediction_data['created_by'],
            closes_at=prediction_data['closes_at'],
            points_awarded=prediction_data.get('points_awarded', 100),
            status=PredictionStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        
        return prediction
    
    def get_prediction_by_id(self, prediction_id: str) -> Optional[Prediction]:
        """Get prediction by ID with related data"""
        return (self.db.query(Prediction)
                .options(joinedload(Prediction.category), joinedload(Prediction.creator))
                .filter(Prediction.id == prediction_id)
                .first())
    
    def get_predictions(
        self, 
        status: Optional[str] = None,
        category_id: Optional[str] = None,
        created_by: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Prediction]:
        """Get predictions with filters and pagination"""
        query = (self.db.query(Prediction)
                 .options(joinedload(Prediction.category), joinedload(Prediction.creator)))
        
        if status:
            query = query.filter(Prediction.status == status)
        if category_id:
            query = query.filter(Prediction.category_id == category_id)
        if created_by:
            query = query.filter(Prediction.created_by == created_by)
        
        return (query.order_by(desc(Prediction.created_at))
                .limit(limit)
                .offset(offset)
                .all())
    
    def get_active_predictions(self, limit: int = 20, offset: int = 0) -> List[Prediction]:
        """Get active predictions that haven't closed yet"""
        return (self.db.query(Prediction)
                .options(joinedload(Prediction.category), joinedload(Prediction.creator))
                .filter(
                    and_(
                        Prediction.status == PredictionStatus.ACTIVE,
                        Prediction.closes_at > datetime.utcnow()
                    )
                )
                .order_by(asc(Prediction.closes_at))
                .limit(limit)
                .offset(offset)
                .all())
    
    def get_trending_predictions(self, limit: int = 10) -> List[Prediction]:
        """Get trending predictions (most voted in recent time)"""
        return (self.db.query(Prediction)
                .options(joinedload(Prediction.category), joinedload(Prediction.creator))
                .filter(Prediction.status == PredictionStatus.ACTIVE)
                .order_by(desc(Prediction.total_votes), desc(Prediction.created_at))
                .limit(limit)
                .all())
    
    def update_prediction(self, prediction_id: str, update_data: Dict[str, Any]) -> Optional[Prediction]:
        """Update prediction"""
        prediction = self.get_prediction_by_id(prediction_id)
        if not prediction:
            return None
        
        allowed_fields = ['title', 'description', 'status', 'closes_at', 'resolution']
        for field, value in update_data.items():
            if field in allowed_fields:
                setattr(prediction, field, value)
        
        prediction.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(prediction)
        
        return prediction
    
    def update_vote_counts(self, prediction_id: str, vote: bool, increment: int = 1) -> Optional[Prediction]:
        """Update vote counts for a prediction"""
        prediction = self.get_prediction_by_id(prediction_id)
        if not prediction:
            return None
        
        if vote:  # Yes vote
            prediction.yes_votes += increment
        else:  # No vote
            prediction.no_votes += increment
        
        prediction.total_votes = prediction.yes_votes + prediction.no_votes
        prediction.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(prediction)
        
        return prediction
    
    def close_prediction(self, prediction_id: str) -> Optional[Prediction]:
        """Close a prediction"""
        prediction = self.get_prediction_by_id(prediction_id)
        if not prediction:
            return None
        
        prediction.status = PredictionStatus.CLOSED
        prediction.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(prediction)
        
        return prediction
    
    def resolve_prediction(self, prediction_id: str, resolution: bool) -> Optional[Prediction]:
        """Resolve a prediction with outcome"""
        prediction = self.get_prediction_by_id(prediction_id)
        if not prediction:
            return None
        
        prediction.status = PredictionStatus.RESOLVED
        prediction.resolution = resolution
        prediction.resolved_at = datetime.utcnow()
        prediction.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(prediction)
        
        return prediction
    
    def get_user_predictions(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Prediction]:
        """Get predictions created by a specific user"""
        return (self.db.query(Prediction)
                .options(joinedload(Prediction.category))
                .filter(Prediction.created_by == user_id)
                .order_by(desc(Prediction.created_at))
                .limit(limit)
                .offset(offset)
                .all())
    
    def get_predictions_with_user_votes(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Dict]:
        """Get predictions with user's votes"""
        predictions_with_votes = (
            self.db.query(Prediction, Vote.vote)
            .options(joinedload(Prediction.category), joinedload(Prediction.creator))
            .outerjoin(Vote, and_(Prediction.id == Vote.prediction_id, Vote.user_id == user_id))
            .filter(Prediction.status == PredictionStatus.ACTIVE)
            .order_by(desc(Prediction.created_at))
            .limit(limit)
            .offset(offset)
            .all()
        )
        
        return [
            {
                'prediction': prediction,
                'user_vote': vote
            }
            for prediction, vote in predictions_with_votes
        ]
    
    def delete_prediction(self, prediction_id: str) -> bool:
        """Delete a prediction (only if no votes exist)"""
        prediction = self.get_prediction_by_id(prediction_id)
        if not prediction:
            return False
        
        # Check if there are any votes
        vote_count = self.db.query(Vote).filter(Vote.prediction_id == prediction_id).count()
        if vote_count > 0:
            return False  # Cannot delete prediction with votes
        
        self.db.delete(prediction)
        self.db.commit()
        
        return True
    
    def get_predictions_closing_soon(self, hours: int = 24) -> List[Prediction]:
        """Get predictions closing within specified hours"""
        from datetime import timedelta
        cutoff_time = datetime.utcnow() + timedelta(hours=hours)
        
        return (self.db.query(Prediction)
                .options(joinedload(Prediction.category), joinedload(Prediction.creator))
                .filter(
                    and_(
                        Prediction.status == PredictionStatus.ACTIVE,
                        Prediction.closes_at <= cutoff_time,
                        Prediction.closes_at > datetime.utcnow()
                    )
                )
                .order_by(asc(Prediction.closes_at))
                .all())