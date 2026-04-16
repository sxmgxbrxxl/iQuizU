"""
Backend proxy for generating study recommendations via Gemini.
This keeps the API key server-side so it is never exposed to the browser.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
from app.config.settings import settings
import re
import time

router = APIRouter()


# ── Request / response models ──────────────────────────────────────────────

class QuestionAnalysis(BaseModel):
    question: str
    correctAnswer: str
    studentAnswer: str
    isCorrect: bool
    type: Optional[str] = "unknown"


class RecommendationRequest(BaseModel):
    quizTitle: str = "Quiz"
    subject: str = "General"
    scorePercentage: float = 0
    correctAnswers: int = 0
    totalQuestions: int = 0
    questions: List[QuestionAnalysis] = []


# ── Helper: build prompt ───────────────────────────────────────────────────

def _build_prompt(req: RecommendationRequest) -> str:
    question_details = "\n\n".join(
        f'Question {i + 1}: "{q.question}"\n'
        f'Correct Answer: "{q.correctAnswer}"\n'
        f'Student\'s Answer: "{q.studentAnswer}"\n'
        f'Result: {"✓ CORRECT" if q.isCorrect else "✗ INCORRECT"}'
        for i, q in enumerate(req.questions)
    )

    return f"""You are an educational AI assistant. Analyze this quiz performance and provide SPECIFIC, actionable study recommendations.

Quiz: {req.quizTitle}
Subject: {req.subject}
Score: {req.scorePercentage}% ({req.correctAnswers}/{req.totalQuestions} correct)

STUDENT'S QUIZ PERFORMANCE:
{question_details}

TASK: Generate 5-8 SPECIFIC study recommendations based on the questions above.

REQUIREMENTS:
1. Each recommendation must reference actual topics/concepts from the quiz.
2. Focus heavily on concepts the student got WRONG.
3. Also include 1-2 recommendations to reinforce concepts they got RIGHT.
4. DO NOT mention or cite specific question numbers (e.g., NEVER say "Q1", "Question 3", "In Q17"). Focus entirely on the concepts and topics.
5. Make recommendations actionable and specific.
6. Include study methods (e.g., "memorize", "practice", "understand the process of", etc.)

Format: Provide ONLY a numbered list with no extra text. Each line should be exactly:
1. [Specific recommendation about actual content from the quiz]
2. [Next recommendation]
etc.

Now generate recommendations for this student:"""


# ── Helper: parse numbered list from AI response ──────────────────────────

def _parse_recommendations(text: str) -> list[str]:
    lines = text.split("\n")
    recs: list[str] = []
    for line in lines:
        trimmed = line.strip()
        match = re.match(r"^(\d+\.|[-•])\s+(.+)", trimmed)
        if match and match.group(2):
            content = match.group(2).strip()
            if len(content) > 15:
                recs.append(content)
    return recs


# ── Endpoint ───────────────────────────────────────────────────────────────

@router.post("/generate-recommendations")
async def generate_recommendations(req: RecommendationRequest):
    """
    Generate AI-powered study recommendations from quiz results.
    The Gemini API key never leaves the server.
    """
    # If there are no questions, return empty list immediately
    if not req.questions:
        return JSONResponse(content={"recommendations": []})

    prompt = _build_prompt(req)

    max_attempts = len(settings.api_keys)
    attempt = 0

    while attempt < max_attempts:
        try:
            genai.configure(api_key=settings.get_current_key())
            model = genai.GenerativeModel("gemini-2.5-flash")

            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 1500,
                    "top_p": 0.95,
                    "top_k": 40,
                },
            )

            if response and response.text:
                recs = _parse_recommendations(response.text)
                return JSONResponse(content={"recommendations": recs})
            else:
                raise ValueError("Empty response from Gemini")

        except Exception as e:
            error_msg = str(e).lower()
            if any(code in error_msg for code in ["429", "quota", "permission", "key", "unauthorized"]):
                print(f"🔄 Recommendation API key error (attempt {attempt + 1}): rotating...")
                settings.rotate_key()
                attempt += 1
                time.sleep(1)
                continue
            else:
                print(f"❌ Gemini recommendation error: {e}")
                # Return empty so the frontend falls back gracefully
                return JSONResponse(content={"recommendations": []})

    # All keys exhausted — return empty so frontend falls back
    return JSONResponse(content={"recommendations": []})
