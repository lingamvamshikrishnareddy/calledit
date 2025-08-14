# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database.connection import get_db
from ..auth.dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/users", tags=["users"])

class UserProfile(BaseModel):
    id: str
    username: str
    display_name: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    predictions_made: int = 0
    predictions_correct: int = 0
    accuracy_rate: float = 0.0
    level: int = 1

class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile"""
    return UserProfile(
        id=str(current_user.id),
        username=current_user.username,
        display_name=current_user.display_name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        total_points=current_user.total_points,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        predictions_made=current_user.predictions_made,
        predictions_correct=current_user.predictions_correct,
        accuracy_rate=float(current_user.accuracy_rate) if current_user.accuracy_rate else 0.0,
        level=current_user.level
    )

@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile"""
    try:
        # Update only provided fields
        if update_data.display_name is not None:
            current_user.display_name = update_data.display_name
        if update_data.avatar_url is not None:
            current_user.avatar_url = update_data.avatar_url
        if update_data.bio is not None:
            current_user.bio = update_data.bio
            
        db.commit()
        db.refresh(current_user)
        
        return UserProfile(
            id=str(current_user.id),
            username=current_user.username,
            display_name=current_user.display_name,
            email=current_user.email,
            avatar_url=current_user.avatar_url,
            bio=current_user.bio,
            total_points=current_user.total_points,
            current_streak=current_user.current_streak,
            longest_streak=current_user.longest_streak,
            predictions_made=current_user.predictions_made,
            predictions_correct=current_user.predictions_correct,
            accuracy_rate=float(current_user.accuracy_rate) if current_user.accuracy_rate else 0.0,
            level=current_user.level
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.get("/{username}", response_model=UserProfile)
async def get_user_profile(
    username: str,
    db: Session = Depends(get_db)
):
    """Get user profile by username"""
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        email=user.email,
        avatar_url=user.avatar_url,
        bio=user.bio,
        total_points=user.total_points,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        predictions_made=user.predictions_made,
        predictions_correct=user.predictions_correct,
        accuracy_rate=float(user.accuracy_rate) if user.accuracy_rate else 0.0,
        level=user.level
    )

@router.get("/", response_model=List[UserProfile])
async def get_users(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of users with optional search"""
    query = db.query(User)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (User.username.ilike(search_term)) |
            (User.display_name.ilike(search_term))
        )
    
    users = query.offset(offset).limit(limit).all()
    
    return [
        UserProfile(
            id=str(user.id),
            username=user.username,
            display_name=user.display_name,
            email=user.email,
            avatar_url=user.avatar_url,
            bio=user.bio,
            total_points=user.total_points,
            current_streak=user.current_streak,
            longest_streak=user.longest_streak,
            predictions_made=user.predictions_made,
            predictions_correct=user.predictions_correct,
            accuracy_rate=float(user.accuracy_rate) if user.accuracy_rate else 0.0,
            level=user.level
        )
        for user in users
    ]