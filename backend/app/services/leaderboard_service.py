# app/services/leaderboard_service.py
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..controllers.leaderboard_controller import LeaderboardController
from ..models.leaderboard import LeaderboardPeriod

class LeaderboardService:
    def __init__(self, db: Session):
        self.db = db
        self.leaderboard_controller = LeaderboardController(db)
    
    async def get_leaderboard(self, period: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get leaderboard for specified period"""
        try:
            period_enum = LeaderboardPeriod(period)
        except ValueError:
            raise ValueError("Invalid period. Must be 'weekly', 'monthly', or 'all_time'")
        
        return self.leaderboard_controller.get_current_leaderboard(period_enum, limit)
    
    async def get_user_rank(self, user_id: str, period: str) -> Dict[str, Any]:
        """Get user's rank in leaderboard"""
        try:
            period_enum = LeaderboardPeriod(period)
        except ValueError:
            raise ValueError("Invalid period. Must be 'weekly', 'monthly', or 'all_time'")
        
        rank_data = self.leaderboard_controller.get_user_rank(user_id, period_enum)
        if not rank_data:
            raise ValueError("User not found in leaderboard")
        
        return rank_data
    
    async def get_friends_leaderboard(self, user_id: str, period: str) -> List[Dict[str, Any]]:
        """Get friends leaderboard"""
        try:
            period_enum = LeaderboardPeriod(period)
        except ValueError:
            raise ValueError("Invalid period. Must be 'weekly', 'monthly', or 'all_time'")
        
        return self.leaderboard_controller.get_friends_leaderboard(user_id, period_enum)
    
    async def rebuild_leaderboard(self, period: str) -> bool:
        """Rebuild leaderboard for period"""
        try:
            period_enum = LeaderboardPeriod(period)
        except ValueError:
            raise ValueError("Invalid period. Must be 'weekly', 'monthly', or 'all_time'")
        
        return self.leaderboard_controller.rebuild_leaderboard(period_enum)
    
    async def get_leaderboard_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's leaderboard history"""
        return self.leaderboard_controller.get_leaderboard_history(user_id, limit)