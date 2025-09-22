from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..auth.dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/sharing", tags=["sharing"])

class ShareAppResponse(BaseModel):
    share_url: str
    message: str

@router.get("/app-url", response_model=ShareAppResponse)
async def get_share_app_url(
    current_user: User = Depends(get_current_user)
):
    """Get shareable app URL"""
    base_url = "https://yourapp.com"  # Replace with your actual app URL
    
    message = f"Check out PredictWin! I'm making predictions and earning points. Join me: {base_url}"
    
    return {
        "share_url": base_url,
        "message": message
    }
    