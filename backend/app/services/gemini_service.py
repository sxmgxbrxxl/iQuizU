import google.generativeai as genai
from app.config.settings import settings
import json
import re
import time

def _configure_gemini():
    """Internal helper to reconfigure Gemini with the current active API key."""
    genai.configure(api_key=settings.get_current_key())

# Initial configuration
_configure_gemini()


def generate_quiz_from_text(
    text: str,
    num_multiple_choice: int = 5,
    num_true_false: int = 5,
    num_identification: int = 5
) -> dict:
    """
    Generates a quiz using Gemini API. Automatically rotates to another key if the current one fails.
    """
    attempt = 0
    max_attempts = len(settings.api_keys)

    while attempt < max_attempts:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")

            prompt = f"""
You are an expert college professor creating a comprehensive assessment. Generate CHALLENGING, COLLEGE-LEVEL quiz questions based on the following text.

TEXT:
{text[:4000]}  

DIFFICULTY REQUIREMENTS:
- Questions must require DEEP UNDERSTANDING and CRITICAL THINKING
- Avoid simple recall or direct copy-paste from text
- Multiple choice distractors should be plausible and test comprehension
- Questions should test application, analysis, and synthesis skills
- Use scenario-based and analytical questions where possible

Generate exactly:
- {num_multiple_choice} Multiple Choice questions:
  * Each with 4 sophisticated options
  * Distractors should be plausible but incorrect
  * Test understanding, NOT just memorization
  * Include "All of the above" or "None of the above" sparingly
  
- {num_true_false} True/False questions:
  * Include nuanced statements that require careful analysis
  * Avoid obvious or trivial statements
  * Test conceptual understanding and common misconceptions
  
- {num_identification} Identification questions:
  * Require specific technical terms or concepts
  * Test precise knowledge and terminology
  * Answers should be 1-3 words (specific terms, not sentences)

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

            # Clean JSON from possible markdown wrappers
            response_text = re.sub(r'^```json\s*', '', response_text)
            response_text = re.sub(r'^```\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
            response_text = response_text.strip()

            quiz_data = json.loads(response_text)

            # Validate structure
            if not all(key in quiz_data for key in ["multiple_choice", "true_false", "identification"]):
                raise ValueError("Invalid quiz data structure returned by Gemini")

            # ✅ Success, return result
            return quiz_data

        except json.JSONDecodeError as e:
            print(f"⚠️ JSON Parse Error: {e}")
            print(f"Raw Response Text: {response_text}")
            raise Exception("Failed to parse Gemini response.")
        except Exception as e:
            error_message = str(e)
            print(f"🚫 Gemini API Error (Attempt {attempt+1}/{max_attempts}): {error_message}")

            # Detect quota or auth errors
            if any(code in error_message.lower() for code in ["429", "quota", "permission", "key", "unauthorized"]):
                print("🔄 Rotating to next API key...")
                settings.rotate_key()
                _configure_gemini()
                attempt += 1
                time.sleep(2)
                continue  # Retry with new key
            else:
                # Other errors not related to quota or key
                raise Exception(f"Gemini error: {error_message}")

    raise Exception("❌ All API keys exhausted. Please add new keys to .env.")


def format_quiz_for_frontend(quiz_data: dict, title: str) -> dict:
    """
    Formats the generated quiz JSON into a frontend-friendly structure.
    """
    questions = []
    total_points = 0

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

    for tf in quiz_data.get("true_false", []):
        questions.append({
            "type": "true_false",
            "question": tf["question"],
            "correct_answer": "True" if tf["correct_answer"] else "False",
            "points": tf.get("points", 1)
        })
        total_points += tf.get("points", 1)

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
