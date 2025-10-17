from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import quiz_routes

app = FastAPI(
    title="Quiz Generator API",
    description="AI-powered quiz generation using Gemini",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(quiz_routes.router, prefix="/api/quiz", tags=["Quiz"])

@app.get("/")
async def root():
    return {
        "message": "Quiz Generator API",
        "status": "running",
        "docs": "/docs"
    }