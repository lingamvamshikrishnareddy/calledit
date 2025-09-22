# app/services/__init__.py - Updated with category service
from .auth_service import AuthService
from .prediction_service import PredictionService
from .category_service import CategoryService  # New category service
from .vote_service import VoteService
from .leaderboard_service import LeaderboardService
from .points_service import PointsService

__all__ = [
    "AuthService", 
    "PredictionService",
    "CategoryService",  # New category service
    "VoteService",
    "LeaderboardService",
    "PointsService"
]