# app/routers/leaderboard.py - FIXED VERSION
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from ..database.connection import get_db
from ..auth.dependencies import get_current_user, get_current_user_optional
from ..models.user import User

# Add redirect_slashes=False to prevent redirects
router = APIRouter(
    prefix="/api/leaderboard", 
    tags=["leaderboard"],
    redirect_slashes=False  # ADD THIS LINE
)

@router.get("/")
async def get_leaderboard(
    period: str = Query("all_time", regex="^(weekly|monthly|all_time)$"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get leaderboard - no auth required"""
    try:
        print(f"DEBUG: Getting leaderboard for period={period}, limit={limit}")
        
        users = (db.query(User)
                .filter(User.is_active == True)
                .order_by(desc(User.total_points))
                .limit(limit)
                .all())
        
        print(f"DEBUG: Found {len(users)} users in database")
        
        result = []
        for idx, user in enumerate(users):
            # Calculate accuracy safely
            accuracy_rate = 0.0
            if user.accuracy_rate:
                accuracy_rate = float(user.accuracy_rate)
            elif user.predictions_made and user.predictions_made > 0:
                accuracy_rate = user.predictions_correct / user.predictions_made
            
            user_data = {
                'rank': idx + 1,
                'user': {
                    'id': str(user.id),
                    'username': user.username or 'Unknown',
                    'display_name': user.display_name or user.username or 'Unknown User',
                    'avatar_url': user.avatar_url
                },
                'points': int(user.total_points) if user.total_points else 0,
                'predictions_made': int(user.predictions_made) if user.predictions_made else 0,
                'predictions_correct': int(user.predictions_correct) if user.predictions_correct else 0,
                'accuracy_rate': round(accuracy_rate, 4),
                'streak': int(user.current_streak) if user.current_streak else 0
            }
            result.append(user_data)
            print(f"DEBUG: User {user.username} has {user.total_points} points")
        
        return result
        
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/my-rank")
async def get_my_rank(
    period: str = Query("all_time", regex="^(weekly|monthly|all_time)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # FIXED: Now requires auth
):
    """Get current user's rank - requires authentication"""
    try:
        print(f"DEBUG: Getting rank for user {current_user.username} in period: {period}")
        
        # Get user's current stats
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count users with higher points
        higher_ranked_count = (db.query(User)
                             .filter(
                                 User.is_active == True,
                                 User.total_points > (user.total_points or 0)
                             )
                             .count())
        
        # Calculate accuracy rate
        accuracy_rate = 0.0
        if user.accuracy_rate:
            accuracy_rate = float(user.accuracy_rate)
        elif user.predictions_made and user.predictions_made > 0:
            accuracy_rate = user.predictions_correct / user.predictions_made
        
        return {
            'rank': higher_ranked_count + 1,
            'points': int(user.total_points) if user.total_points else 0,
            'predictions_made': int(user.predictions_made) if user.predictions_made else 0,
            'predictions_correct': int(user.predictions_correct) if user.predictions_correct else 0,
            'accuracy_rate': round(accuracy_rate, 4),
            'streak': int(user.current_streak) if user.current_streak else 0
        }
        
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get rank: {str(e)}")

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        user_count = db.query(User).filter(User.is_active == True).count()
        active_users = db.query(User).filter(User.is_active == True).limit(3).all()
        
        sample_users = []
        for user in active_users:
            sample_users.append({
                'username': user.username,
                'points': user.total_points,
                'predictions': user.predictions_made
            })
        
        return {
            "status": "healthy",
            "total_active_users": user_count,
            "sample_users": sample_users,
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")
