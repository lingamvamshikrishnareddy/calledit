# app/models/__init__.py - Updated with separate Category model
from .user import User
from .category import Category  # Separate Category model
from .prediction import Prediction
from .vote import Vote
from .leaderboard import LeaderboardEntry, Achievement, UserAchievement
from .points_transaction import PointsTransaction, TransactionType

# Make sure all models are imported so SQLAlchemy can resolve relationships
__all__ = [
    "User",
    "Category",  # Separate Category model
    "Prediction", 
    "Vote",
    "LeaderboardEntry",
    "Achievement", 
    "UserAchievement",
    "PointsTransaction",
    "TransactionType"
]