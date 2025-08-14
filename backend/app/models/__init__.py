# app/models/__init__.py
from .user import User
from .prediction import Prediction, Category, PredictionStatus, CategoryType
from .vote import Vote
from .leaderboard import (
    LeaderboardEntry, 
    LeaderboardPeriod, 
    LeaderboardType,
    Achievement,
    UserAchievement
)

# Export all models
__all__ = [
    "User",
    "Prediction", 
    "Category",
    "Vote",
    "LeaderboardEntry",
    "Achievement",
    "UserAchievement",
    "PredictionStatus",
    "CategoryType", 
    "LeaderboardPeriod",
    "LeaderboardType"
]