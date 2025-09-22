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

# Import ALL models to ensure they're registered with SQLAlchemy
from .models.user import User
from .models.prediction import Prediction
from .models.category import Category
from .models.vote import Vote
from .models.points_transaction import PointsTransaction
# Import any other models you have
# from .models.comment import Comment
# from .models.notification import Notification

# Configure SQLAlchemy mappers
from sqlalchemy.orm import configure_mappers

# Routers - Updated imports to include categories
from .routers import (
    auth,
    predictions, 
    categories,  # NEW: Categories router
    votes,
    users,
    leaderboard,
    points
)

# Lifespan for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("🚀 Starting CalledIt API...")

        # Import and configure all models/mappers FIRST
        print("🔧 Configuring SQLAlchemy mappers...")
        try:
            # This ensures all model relationships are properly configured
            configure_mappers()
            print("✅ SQLAlchemy mappers configured successfully!")
        except Exception as mapper_error:
            print(f"⚠️ Mapper configuration warning: {mapper_error}")

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

        # Test database connectivity with models
        print("🧪 Testing model operations...")
        try:
            from sqlalchemy.orm import sessionmaker
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            with SessionLocal() as session:
                # Test basic query operations
                session.query(User).first()
                session.query(Category).first() 
                session.query(Prediction).first()
            print("✅ Model operations test passed")
        except Exception as model_error:
            print(f"⚠️ Model operations warning: {model_error}")

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
    allow_methods=["*"],
    allow_headers=["*"],
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

# Health check endpoint - Updated to include comprehensive service checks
@app.get("/health")
async def health_check():
    """API Health check endpoint with comprehensive service validation"""
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

    # SQLAlchemy mappers check
    try:
        configure_mappers()
        health_status["services"]["sqlalchemy_mappers"] = "configured"
    except Exception as e:
        health_status["services"]["sqlalchemy_mappers"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Models availability check
    models_status = {}
    try:
        models_status["User"] = "loaded"
        models_status["Prediction"] = "loaded"
        models_status["Category"] = "loaded"
        models_status["Vote"] = "loaded"
        models_status["PointsTransaction"] = "loaded"
        health_status["services"]["models"] = models_status
    except Exception as e:
        health_status["services"]["models"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Database tables check
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        health_status["services"]["database_tables"] = {
            "count": len(tables),
            "tables": tables[:10] if len(tables) > 10 else tables  # Limit output
        }
    except Exception as e:
        health_status["services"]["database_tables"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status

# Register routers - INCLUDING categories router
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(categories.router)  # NEW: Categories router
app.include_router(votes.router)
app.include_router(users.router)
app.include_router(leaderboard.router)
app.include_router(points.router)

# Debug endpoint to list all routes
@app.get("/routes")
async def list_routes():
    """Debug endpoint to list all available routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'unnamed')
            })
    
    # Group routes by prefix for better organization
    grouped_routes = {}
    for route in routes:
        prefix = route["path"].split('/')[1] if len(route["path"].split('/')) > 1 else 'root'
        if prefix not in grouped_routes:
            grouped_routes[prefix] = []
        grouped_routes[prefix].append(route)
    
    return {
        "total_routes": len(routes),
        "routes_by_group": grouped_routes
    }

# Debug endpoint for model inspection
@app.get("/debug/models")
async def debug_models():
    """Debug endpoint to inspect model configurations and relationships"""
    try:
        from sqlalchemy import inspect
        from sqlalchemy.orm import class_mapper
        
        model_info = {}
        
        # Inspect each model
        models = [User, Prediction, Category, Vote, PointsTransaction]
        
        for model in models:
            try:
                mapper = class_mapper(model)
                inspector = inspect(model)
                
                model_info[model.__name__] = {
                    "table_name": mapper.local_table.name,
                    "columns": [col.name for col in inspector.columns],
                    "relationships": list(mapper.relationships.keys()),
                    "primary_key": [col.name for col in mapper.primary_key]
                }
            except Exception as model_error:
                model_info[model.__name__] = f"error: {str(model_error)}"
        
        return {
            "mappers_configured": True,
            "models": model_info,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "mappers_configured": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Predictions API is running! 🚀",
        "version": "1.0.0",
        "status": "healthy",
        "features": [
            "Authentication & User Management",
            "Predictions & Categories",
            "Category Management System",  # NEW: Categories feature
            "Voting System", 
            "Leaderboards",
            "Points & Rewards System",
            "App Sharing & Invitations"
        ],
        "docs": "/docs",
        "health": "/health",
        "routes": "/routes",
        "debug_models": "/debug/models",
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
            "path": str(request.url.path),
            "available_endpoints": "/routes"
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
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )