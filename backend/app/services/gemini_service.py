import google.generativeai as genai
from app.config.settings import settings
import json
import re

# Configure Gemini with API key from settings
genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_quiz_from_text(
    text: str,
    num_multiple_choice: int = 5,
    num_true_false: int = 5,
    num_identification: int = 5
) -> dict:
    """
    Generate quiz questions using Gemini AI.
    """
    try:
        # Use gemini-2.5-flash model
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
You are an expert educator. Generate quiz questions based on the following text.

TEXT:
{text[:4000]}  

Generate exactly:
- {num_multiple_choice} Multiple Choice questions (with 4 options each, mark correct answer)
- {num_true_false} True/False questions
- {num_identification} Identification questions (short answer)

Return ONLY valid JSON in this exact format:
{{
  "multiple_choice": [
    {{
      "question": "Question text here?",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "points": 1
    }}
  ],
  "true_false": [
    {{
      "question": "Statement here",
      "correct_answer": true,
      "points": 1
    }}
  ],
  "identification": [
    {{
      "question": "Question here?",
      "correct_answer": "Answer here",
      "points": 1
    }}
  ]
}}

IMPORTANT: Return ONLY the JSON object, no markdown, no explanations, no code blocks.
"""
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        response_text = response.text.strip()
        
        # Clean response - remove markdown code blocks if present
        response_text = re.sub(r'^```json\s*', '', response_text)
        response_text = re.sub(r'^```\s*', '', response_text)
        response_text = re.sub(r'\s*```$', '', response_text)
        response_text = response_text.strip()
        
        # Parse JSON
        quiz_data = json.loads(response_text)
        
        # Validate the response structure
        if not all(key in quiz_data for key in ["multiple_choice", "true_false", "identification"]):
            raise ValueError("Invalid quiz data structure returned by Gemini")
        
        return quiz_data
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Response text: {response_text}")
        raise Exception(f"Failed to parse Gemini response: {str(e)}")
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise Exception(f"Failed to generate quiz: {str(e)}")


def format_quiz_for_frontend(quiz_data: dict, title: str) -> dict:
    """
    Format quiz data for frontend consumption.
    """
    questions = []
    total_points = 0
    
    # Add multiple choice questions
    for mc in quiz_data.get("multiple_choice", []):
        choices = []
        for i, choice_text in enumerate(mc["choices"]):
            choices.append({
                "text": choice_text,
                "is_correct": i == mc["correct_answer"]
            })
        
        questions.append({
            "type": "multiple_choice",
            "question": mc["question"],
            "choices": choices,
            "points": mc.get("points", 2)
        })
        total_points += mc.get("points", 2)
    
    # Add true/false questions
    for tf in quiz_data.get("true_false", []):
        questions.append({
            "type": "true_false",
            "question": tf["question"],
            "correct_answer": "True" if tf["correct_answer"] else "False",
            "points": tf.get("points", 1)
        })
        total_points += tf.get("points", 1)
    
    # Add identification questions
    for id_q in quiz_data.get("identification", []):
        questions.append({
            "type": "identification",
            "question": id_q["question"],
            "correct_answer": id_q["correct_answer"],
            "points": id_q.get("points", 2)
        })
        total_points += id_q.get("points", 2)
    
    return {
        "title": title,
        "questions": questions,
        "total_points": total_points
    }