# app/routers/__init__.py
from .auth import router as auth_router
from .predictions import router as predictions_router
from .users import router as users_router
from .votes import router as votes_router
from .leaderboard import router as leaderboard_router

__all__ = [
    "auth_router",
    "predictions_router", 
    "users_router",
    "votes_router",
    "leaderboard_router"
]