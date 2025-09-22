# app/routers/__init__.py - Updated with categories router
from .auth import router as auth_router
from .predictions import router as predictions_router
from .categories import router as categories_router  # New categories router
from .users import router as users_router
from .votes import router as votes_router
from .leaderboard import router as leaderboard_router
from .points import router as points_router
from .sharing import router as sharing_router

__all__ = [
    "auth_router",
    "predictions_router",
    "categories_router",  # New categories router
    "users_router",
    "votes_router",
    "leaderboard_router",
    "points_router",
    "sharing_router"
]