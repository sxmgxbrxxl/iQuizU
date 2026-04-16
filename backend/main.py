import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import quiz_routes, email_routes, recommendation_routes

app = FastAPI(
    title="Quiz Generator API",
    description="AI-powered quiz generation using Gemini",
    version="1.0.0"
)   

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://iquizu-29da7.firebaseapp.com",
    "https://iquizu-29da7.web.app",
    "https://iquizu.online",
    "https://www.iquizu.online",
]

extra_origin = os.getenv("FRONTEND_URL", "").strip()
if extra_origin and extra_origin not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

app.include_router(quiz_routes.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(email_routes.router, prefix="/api/email", tags=["Email"])
app.include_router(recommendation_routes.router, prefix="/api", tags=["Recommendations"])

@app.get("/")
async def root():
    return {"message": "Quiz Generator API", "status": "running", "docs": "/docs"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}