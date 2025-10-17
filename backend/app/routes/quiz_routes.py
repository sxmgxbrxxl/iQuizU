from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import shutil
from app.config.settings import settings
from app.utils.pdf_extractor import extract_text_from_pdf
from app.services.gemini_service import generate_quiz_from_text, format_quiz_for_frontend
from app.services.bert_classifier import classify_multiple_questions, get_detailed_classification

router = APIRouter()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/generate-from-pdf")
async def generate_quiz_from_pdf(
    file: UploadFile = File(...),
    title: str = Form("Generated Quiz"),
    num_multiple_choice: int = Form(5),
    num_true_false: int = Form(5),
    num_identification: int = Form(5)
):
    """
    Generate quiz from uploaded PDF using Gemini AI with BERT LOTS/HOTS classification.
    """
    file_path = None
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        print(f"📄 Processing file: {file.filename}")
        
        # Save uploaded file
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text from PDF
        print("📖 Extracting text from PDF...")
        extracted_text = extract_text_from_pdf(file_path)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Failed to extract text from PDF")
        
        print(f"✓ Extracted {len(extracted_text)} characters")
        
        # Generate quiz using Gemini
        print(f"🤖 Generating quiz (MC: {num_multiple_choice}, TF: {num_true_false}, ID: {num_identification})...")
        quiz_data = generate_quiz_from_text(
            extracted_text,
            num_multiple_choice,
            num_true_false,
            num_identification
        )
        
        # Format for frontend
        formatted_quiz = format_quiz_for_frontend(quiz_data, title)
        
        # ⭐ NEW: Classify questions using BERT ⭐
        print("🧠 Classifying questions with BERT (LOTS/HOTS)...")
        questions = formatted_quiz.get('questions', [])
        
        if questions:
            # Extract question texts
            question_texts = [q['question'] for q in questions]
            
            # Batch classify all questions (efficient)
            classifications = classify_multiple_questions(question_texts)
            
            # Add classification to each question
            for i, question in enumerate(questions):
                classification, confidence = classifications[i]
                question['bloom_classification'] = classification
                question['classification_confidence'] = round(confidence, 4)
            
            # Calculate statistics
            lots_count = sum(1 for q in questions if q.get('bloom_classification') == 'LOTS')
            hots_count = sum(1 for q in questions if q.get('bloom_classification') == 'HOTS')
            total = len(questions)
            
            formatted_quiz['classification_stats'] = {
                'total_questions': total,
                'lots_count': lots_count,
                'hots_count': hots_count,
                'lots_percentage': round((lots_count / total) * 100, 2) if total > 0 else 0,
                'hots_percentage': round((hots_count / total) * 100, 2) if total > 0 else 0,
            }
            
            print(f"✓ Classification complete: {lots_count} LOTS, {hots_count} HOTS")
        
        return JSONResponse(content={
            "success": True,
            "quiz": formatted_quiz,
            "message": "Quiz generated successfully with BERT classification"
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error generating quiz: {e}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": str(e)
            }
        )
    finally:
        # Clean up uploaded file
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"🗑️ Cleaned up: {file.filename}")
            except:
                pass


@router.post("/reclassify-question")
async def reclassify_question(data: dict):
    """
    Manually reclassify a single question using BERT.
    """
    try:
        question_text = data.get('question')
        
        if not question_text:
            raise HTTPException(status_code=400, detail="Question text is required")
        
        # Get detailed classification
        result = get_detailed_classification(question_text)
        
        return JSONResponse(content={
            "success": True,
            "classification": result
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": str(e)
            }
        )


@router.get("/classification-keywords")
async def get_classification_keywords():
    """
    Get LOTS/HOTS keyword lists for reference.
    """
    from app.utils.blooms_taxonomy import get_all_keywords
    
    try:
        keywords = get_all_keywords()
        return JSONResponse(content={
            "success": True,
            "keywords": keywords
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": str(e)
            }
        )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy", 
        "service": "quiz-generator",
        "bert_classifier": "enabled"
    }