from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import os
from datetime import datetime

# Import database and config
from .database.connection import engine, Base
from .config.jwt_config import jwt_config

# Routers - Updated imports to match the structure you want
from .routers import (
    auth,
    predictions, 
    votes,
    users,
    leaderboard
)

# Lifespan for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("🚀 Starting CalledIt API...")

        # Create DB tables
        print("📊 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")

        # Test JWT config
        print("🔐 Testing JWT configuration...")
        try:
            test_data = {"sub": "test", "email": "test@example.com"}
            token = jwt_config.create_access_token(test_data)
            jwt_config.verify_access_token(token)
            print("✅ JWT configuration working")
        except Exception as jwt_error:
            print(f"⚠️ JWT configuration warning: {jwt_error}")

        print("✅ Startup complete")
    except Exception as e:
        print(f"❌ Critical startup error: {e}")
        print("Starting in degraded mode...")

    yield
    print("🛑 API shutting down")

# FastAPI app - Updated with simplified title
app = FastAPI(
    title="Predictions API",
    description="Social prediction app for Gen Z - Call what happens next! 🔮",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration - Updated to allow all origins for development
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3000",
    "http://10.0.2.2:8000",  # Android emulator
    "https://your-frontend-domain.com"
]
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins = ["*"]  # Allow all origins in development

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Simplified to allow all methods
    allow_headers=["*"],  # Simplified to allow all headers
)

# Trusted hosts middleware
trusted_hosts = ["*"] if os.getenv("ENVIRONMENT") == "development" else [
    "localhost",
    "127.0.0.1", 
    "10.0.2.2",  # Android emulator
    "your-api-domain.com"
]
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts
)

# Health check endpoint - Updated to match the simpler structure
@app.get("/health")
async def health_check():
    """API Health check endpoint"""
    health_status = {
        "status": "ok",
        "message": "Predictions API is running",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }

    # Database connectivity check
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        health_status["services"]["database"] = "connected"
    except Exception as e:
        health_status["services"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # JWT configuration check
    try:
        test_data = {"sub": "health_check", "test": True}
        token = jwt_config.create_access_token(test_data)
        jwt_config.verify_access_token(token)
        health_status["services"]["jwt_auth"] = "working"
    except Exception as e:
        health_status["services"]["jwt_auth"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status

# Register routers - MAKE SURE votes router is included
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(votes.router)  # CRITICAL: This line must be present
app.include_router(users.router)
app.include_router(leaderboard.router)

# Debug endpoint to list all routes
@app.get("/routes")
async def list_routes():
    """Debug endpoint to list all available routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {"routes": routes}

# Root endpoint - Optional, can be removed if not needed
@app.get("/")
async def root():
    return {
        "message": "Predictions API is running! 🚀",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
        "timestamp": datetime.utcnow().isoformat()
    }

# Exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Resource not found",
            "message": "The requested resource could not be found",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(500) 
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error", 
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "message": "Request data validation failed",
            "details": exc.detail if hasattr(exc, 'detail') else str(exc)
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        app,  # Simplified - directly pass app instead of string
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )