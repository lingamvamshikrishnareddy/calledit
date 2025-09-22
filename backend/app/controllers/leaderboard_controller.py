# app/controllers/leaderboard_controller.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

from ..models.leaderboard import LeaderboardEntry, LeaderboardPeriod
from ..models.user import User

class LeaderboardController:
    def __init__(self, db: Session):
        self.db = db
    
    def get_current_leaderboard(self, period: LeaderboardPeriod, limit: int = 50) -> List[Dict[str, Any]]:
        """Get current leaderboard for a period - matches frontend expectations"""
        if period == LeaderboardPeriod.ALL_TIME:
            # For all-time, get directly from users table
            users = (self.db.query(User)
                    .filter(User.is_active == True)
                    .order_by(desc(User.total_points))
                    .limit(limit)
                    .all())
            
            return [
                {
                    'rank': idx + 1,
                    'user': {
                        'id': str(user.id),
                        'username': user.username,
                        'display_name': user.display_name,
                        'avatar_url': user.avatar_url
                    },
                    'points': user.total_points,
                    'predictions_made': user.predictions_made,
                    'predictions_correct': user.predictions_correct,
                    'accuracy_rate': float(user.accuracy_rate) if user.accuracy_rate else 0.0,
                    'streak': user.current_streak
                }
                for idx, user in enumerate(users)
            ]
        
        # For weekly/monthly, get from leaderboard_entries
        period_start, period_end = self._get_period_dates(period)
        
        entries = (self.db.query(LeaderboardEntry, User)
                  .join(User, LeaderboardEntry.user_id == User.id)
                  .filter(and_(
                      LeaderboardEntry.period == period.value,
                      LeaderboardEntry.period_start == period_start,
                      LeaderboardEntry.period_end == period_end
                  ))
                  .order_by(LeaderboardEntry.rank)
                  .limit(limit)
                  .all())
        
        return [
            {
                'rank': entry.rank,
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'display_name': user.display_name,
                    'avatar_url': user.avatar_url
                },
                'points': entry.points,
                'predictions_made': entry.predictions_made,
                'predictions_correct': entry.predictions_correct,
                'accuracy_rate': float(entry.accuracy_rate),
                'streak': entry.streak
            }
            for entry, user in entries
        ]
    
    def get_user_rank(self, user_id: str, period: LeaderboardPeriod) -> Optional[Dict[str, Any]]:
        """Get user's rank in leaderboard - matches frontend expectations"""
        if period == LeaderboardPeriod.ALL_TIME:
            # Count users with more points
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
                
            higher_ranked = (self.db.query(User)
                           .filter(and_(
                               User.is_active == True,
                               User.total_points > user.total_points
                           ))
                           .count())
            
            return {
                'rank': higher_ranked + 1,
                'points': user.total_points,
                'predictions_made': user.predictions_made,
                'predictions_correct': user.predictions_correct,
                'accuracy_rate': float(user.accuracy_rate) if user.accuracy_rate else 0.0,
                'streak': user.current_streak
            }
        
        # For weekly/monthly periods
        period_start, period_end = self._get_period_dates(period)
        
        entry = (self.db.query(LeaderboardEntry)
                .filter(and_(
                    LeaderboardEntry.user_id == user_id,
                    LeaderboardEntry.period == period.value,
                    LeaderboardEntry.period_start == period_start
                ))
                .first())
        
        if not entry:
            return None
        
        return {
            'rank': entry.rank,
            'points': entry.points,
            'predictions_made': entry.predictions_made,
            'predictions_correct': entry.predictions_correct,
            'accuracy_rate': float(entry.accuracy_rate),
            'streak': entry.streak
        }
    
    def get_friends_leaderboard(self, user_id: str, period: LeaderboardPeriod, limit: int = 50) -> List[Dict[str, Any]]:
        """Get friends leaderboard - requires friends system implementation"""
        # TODO: This requires a friends/following system to be implemented
        # For now, return empty list until friends relationships are added to database
        # Query would be something like:
        # SELECT u.*, f.created_at as friendship_date 
        # FROM users u 
        # JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id) 
        # WHERE (f.user_id = user_id OR f.friend_id = user_id) AND f.status = 'accepted'
        # ORDER BY u.total_points DESC
        # LIMIT limit
        
        return []
    
    def _get_period_dates(self, period: LeaderboardPeriod) -> tuple:
        """Get start and end dates for a leaderboard period"""
        now = datetime.utcnow()
        
        if period == LeaderboardPeriod.WEEKLY:
            # Start of current week (Monday)
            days_since_monday = now.weekday()
            period_start = (now - timedelta(days=days_since_monday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            period_end = period_start + timedelta(days=7)
            
        elif period == LeaderboardPeriod.MONTHLY:
            # Start of current month
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            # Start of next month
            if now.month == 12:
                period_end = period_start.replace(year=now.year + 1, month=1)
            else:
                period_end = period_start.replace(month=now.month + 1)
                
        else:  # ALL_TIME
            period_start = datetime.min
            period_end = datetime.max
        
        return period_start, period_end
    
    def create_leaderboard_entry(self, entry_data: Dict[str, Any]) -> LeaderboardEntry:
        """Create a new leaderboard entry"""
        entry = LeaderboardEntry(
            id=str(uuid.uuid4()),
            user_id=entry_data['user_id'],
            period=entry_data['period'],
            period_start=entry_data['period_start'],
            period_end=entry_data['period_end'],
            rank=entry_data['rank'],
            points=entry_data.get('points', 0),
            predictions_made=entry_data.get('predictions_made', 0),
            predictions_correct=entry_data.get('predictions_correct', 0),
            accuracy_rate=entry_data.get('accuracy_rate', 0),
            streak=entry_data.get('streak', 0),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        
        return entry