# app/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import os
from datetime import datetime

from .database.connection import engine, Base

# Import JWT config instead of Supabase
from .config.jwt_config import jwt_config

from .routers import (
    auth as auth_router,
    predictions as predictions_router,
    users as users_router,
    votes as votes_router,
    leaderboard as leaderboard_router
)

# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        print("🚀 Starting CalledIt API...")
        
        # Create all database tables
        print("📊 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        # Test JWT configuration
        print("🔐 Testing JWT configuration...")
        try:
            # Test JWT token creation and verification
            test_data = {"sub": "test", "email": "test@example.com"}
            test_token = jwt_config.create_access_token(test_data)
            decoded = jwt_config.verify_access_token(test_token)
            print("✅ JWT configuration working")
        except Exception as jwt_error:
            print(f"⚠️  JWT configuration warning: {jwt_error}")
            print("   Authentication may not work properly")
        
        print("🚀 CalledIt API startup complete")
        
    except Exception as e:
        print(f"❌ Critical startup error: {e}")
        # Don't raise - let the app start anyway for debugging
        print("   Starting in degraded mode...")
    
    yield
    
    # Shutdown
    print("🛑 CalledIt API shutting down")

# Initialize FastAPI app
app = FastAPI(
    title="CalledIt API",
    description="Social prediction app for Gen Z - Call what happens next! 🔮",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
allowed_origins = [
    "http://localhost:3000",  # React development server
    "http://localhost:3001",  # Alternative React port
    "http://127.0.0.1:3000",  # Alternative localhost
    "https://your-frontend-domain.com",  # Production frontend
]

if os.getenv("ENVIRONMENT") == "development":
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted host middleware for security
trusted_hosts = ["*"] if os.getenv("ENVIRONMENT") == "development" else [
    "localhost",
    "127.0.0.1",
    "your-api-domain.com"
]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts
)

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "CalledIt API is running! 🚀",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
        "timestamp": datetime.utcnow().isoformat(),
        "auth_system": "JWT + PostgreSQL"
    }

@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Test database connection
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        health_status["services"]["database"] = "connected"
    except Exception as e:
        health_status["services"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Test JWT configuration
    try:
        test_data = {"sub": "health_check", "test": True}
        test_token = jwt_config.create_access_token(test_data)
        jwt_config.verify_access_token(test_token)
        health_status["services"]["jwt_auth"] = "working"
    except Exception as e:
        health_status["services"]["jwt_auth"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

# API Info endpoint
@app.get("/api/info")
async def api_info():
    return {
        "name": "CalledIt API",
        "version": "1.0.0",
        "description": "Social prediction platform API",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "authentication": "JWT + PostgreSQL",
        "database": "PostgreSQL + SQLAlchemy",
        "endpoints": {
            "auth": "/api/auth",
            "predictions": "/api/predictions",
            "users": "/api/users",
            "votes": "/api/votes",
            "leaderboard": "/api/leaderboard"
        },
        "docs": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }

# Include routers with API prefix
app.include_router(auth_router.router, prefix="/api")
app.include_router(predictions_router.router, prefix="/api")
app.include_router(users_router.router, prefix="/api")
app.include_router(votes_router.router, prefix="/api")
app.include_router(leaderboard_router.router, prefix="/api")

# Global exception handlers
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
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )