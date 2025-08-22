# app/models/__init__.py - Import all models so SQLAlchemy can find relationships
from .user import User
from .prediction import Prediction, Category
from .vote import Vote
from .leaderboard import LeaderboardEntry, Achievement, UserAchievement


# Make sure all models are imported so SQLAlchemy can resolve relationships
__all__ = [
    "User",
    "Prediction", 
    "Category",
    "Vote",
    "LeaderboardEntry",
    "Achievement", 
    "UserAchievement"
]