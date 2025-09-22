# app/controllers/__init__.py
from .user_controller import UserController
from .auth_controller import AuthController
from .prediction_controller import PredictionController
from .category_controller import CategoryController
from .vote_controller import VoteController
from .leaderboard_controller import LeaderboardController
from .points_controller import PointsController

__all__ = [
    "UserController",
    "AuthController", 
    "PredictionController",
    "CategoryController",
    "VoteController",
    "LeaderboardController",
    "PointsController"
]