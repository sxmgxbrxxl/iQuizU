import google.generativeai as genai
from app.config.settings import settings
import json
import re
import time
import sys
import os

# Import the classifier
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.bert_classifier import classify_multiple_questions

def _configure_gemini():
    """Internal helper to reconfigure Gemini with the current active API key."""
    genai.configure(api_key=settings.get_current_key())

# Initial configuration
_configure_gemini()


def sanitize_text(text: str) -> str:
    """
    Remove surrogate characters and any other characters that cannot be
    encoded as UTF-8. This must be called before sending text to Gemini.
    """
    # Encode with surrogatepass to handle lone surrogates, then decode ignoring errors
    text = text.encode('utf-16', 'surrogatepass').decode('utf-16')
    text = text.encode('utf-8', errors='ignore').decode('utf-8')
    return text


def clean_pdf_text(text: str) -> str:
    """
    Remove metadata, headings, figure labels from PDF text.
    Keep only the actual content/concepts.
    """
    # ✅ Strip surrogate/non-UTF-8 characters first
    text = sanitize_text(text)

    # Remove common metadata patterns
    text = re.sub(r'(Lesson|Module|Chapter|Unit)\s+\d+[:\-\.]?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(Figure|Fig\.|Table|Diagram)\s+\d+\.?\d*[:\-\.]?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(Section|Part)\s+\d+\.?\d*[:\-\.]?\s*', '', text, flags=re.IGNORECASE)
    
    # Remove page numbers
    text = re.sub(r'\bPage\s+\d+\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\d+$', '', text, flags=re.MULTILINE)
    
    # Remove common headers/footers
    text = re.sub(r'(Copyright|©|\(c\)).*?\d{4}', '', text, flags=re.IGNORECASE)
    
    # Remove references to document structure in sentences
    text = re.sub(r'as (shown|discussed|mentioned) in (lesson|module|chapter|figure|section)\s+\d+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'refer to (lesson|module|chapter|figure|section)\s+\d+', '', text, flags=re.IGNORECASE)
    
    # Remove multiple whitespaces/newlines
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = re.sub(r' +', ' ', text)
    
    return text.strip()


def validate_question_quality(question: str, choices: list = None) -> tuple:
    """
    Check if question is about content, not metadata.
    Returns (is_valid, reason)
    """
    metadata_patterns = [
        (r'\blesson\s+\d+\b', "References lesson number"),
        (r'\bmodule\s+\d+\b', "References module number"),
        (r'\bchapter\s+\d+\b', "References chapter number"),
        (r'\bfigure\s+\d+', "References figure number"),
        (r'\bsection\s+\d+', "References section number"),
        (r'\btable\s+\d+', "References table number"),
        (r'what.*covered in', "Asks about document structure"),
        (r'according to (the )?(lesson|module|figure|chapter)', "References document structure"),
        (r'in (lesson|module|chapter|section)\s+\d+', "References document structure"),
        (r'(lesson|module|chapter).+discusses?', "Asks what section discusses"),
    ]
    
    question_lower = question.lower()
    
    for pattern, reason in metadata_patterns:
        if re.search(pattern, question_lower):
            return False, f"Question: {reason}"
    
    if choices:
        for i, choice in enumerate(choices):
            choice_lower = str(choice).lower()
            for pattern, reason in metadata_patterns:
                if re.search(pattern, choice_lower):
                    return False, f"Choice {i+1}: {reason}"
    
    return True, "Valid"


def calculate_blooms_distribution(total_questions: int) -> dict:
    """
    Calculate question distribution based on Bloom's Taxonomy:
    - Remembering: 10% (EASY)
    - Understanding: 20% (EASY)
    - Application: 30% (EASY)
    - Analysis: 15% (AVERAGE)
    - Evaluation: 15% (AVERAGE)
    - Creating: 10% (DIFFICULTY)

    LOTS = Remembering + Understanding + Application = 60%
    HOTS = Analysis + Evaluation + Creating = 40%
    """
    return {
        "remembering": max(1, round(total_questions * 0.10)),
        "understanding": max(1, round(total_questions * 0.20)),
        "application": max(1, round(total_questions * 0.30)),
        "analysis": max(1, round(total_questions * 0.15)),
        "evaluation": max(1, round(total_questions * 0.15)),
        "creating": max(1, round(total_questions * 0.10))
    }


def generate_quiz_from_text(
    text: str,
    num_multiple_choice: int = 5,
    num_true_false: int = 5,
    num_identification: int = 5
) -> dict:
    """
    Generates a balanced quiz following Bloom's Taxonomy distribution.
    60% LOTS (Easy) / 40% HOTS (Average-Difficulty)
    """
    # ✅ CLEAN AND SANITIZE THE TEXT FIRST
    print("🧹 Cleaning PDF text...")
    cleaned_text = clean_pdf_text(text)
    print(f"✅ Text cleaned: {len(text)} → {len(cleaned_text)} characters")

    total_questions = num_multiple_choice + num_true_false + num_identification
    distribution = calculate_blooms_distribution(total_questions)

    attempt = 0
    max_attempts = len(settings.api_keys)
    max_generation_attempts = 3

    for generation_attempt in range(max_generation_attempts):
        attempt = 0

        while attempt < max_attempts:
            try:
                model = genai.GenerativeModel("gemini-2.5-flash")

                prompt = f"""
You are an expert college professor creating a comprehensive assessment following Bloom's Taxonomy.

TEXT CONTENT (Focus on concepts and ideas):
{cleaned_text[:4000]}

🚨 CRITICAL CONTENT RULES:
1. Generate questions about CONCEPTS, THEORIES, and IDEAS in the text
2. NEVER ask about or reference:
   - Lesson numbers (e.g., "Lesson 1", "Lesson 2")
   - Module numbers (e.g., "Module 4")
   - Chapter numbers (e.g., "Chapter 3")
   - Figure labels (e.g., "Figure 1.2", "Fig. 3")
   - Section titles or subheadings
   - Page numbers or document structure
   - "What is covered in...", "What does X discuss..."

3. Questions MUST focus on:
   - Core concepts and definitions
   - Principles, theories, and mechanisms
   - Applications and real-world examples
   - Problem-solving approaches
   - Relationships between ideas
   - Practical implications

4. Answer choices must be CONCEPTUALLY DISTINCT, not structural references

✅ GOOD EXAMPLES:
- "What is the primary advantage of using hash tables for data retrieval?"
- "Which sorting algorithm has O(n log n) average time complexity?"
- "How does encapsulation enhance code maintainability?"
- "What principle states that subclasses should be substitutable for their base classes?"

❌ BAD EXAMPLES (DO NOT CREATE):
- "What topic is covered in Lesson 1?"
- "Module 4's closer look discusses which concept?"
- "According to Figure 2.3, what is shown?"
- "What is the main focus of Chapter 2?"

DISTRIBUTION - Follow this EXACT count across all {total_questions} questions:

EASY ITEMS (60% - LOTS):
- {distribution['remembering']} Remembering questions (10%): Use "identify", "define", "list", "name", "recall"
- {distribution['understanding']} Understanding questions (20%): Use "explain", "describe", "summarize", "interpret"
- {distribution['application']} Application questions (30%): Use "apply", "calculate", "solve", "demonstrate", "use"

AVERAGE DIFFICULTY (30% - HOTS):
- {distribution['analysis']} Analysis questions (15%): Use "analyze", "compare", "contrast", "examine", "distinguish"
- {distribution['evaluation']} Evaluation questions (15%): Use "evaluate", "assess", "justify", "critique", "argue"

DIFFICULT ITEMS (10% - HOTS):
- {distribution['creating']} Creating questions (10%): Use "design", "create", "formulate", "propose", "develop"

Distribute these {total_questions} questions across:
- {num_multiple_choice} Multiple Choice (all cognitive levels)
- {num_true_false} True/False (all cognitive levels)
- {num_identification} Identification (all cognitive levels)

Generate EXACTLY {total_questions} questions following the distribution above.

Return ONLY valid JSON in this exact format:
{{
  "multiple_choice": [
    {{
      "question": "Question text here?",
      "choices": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_answer": 0,
      "points": 1,
      "cognitive_level": "remembering",
      "difficulty": "easy"
    }}
  ],
  "true_false": [
    {{
      "question": "Statement here",
      "correct_answer": true,
      "points": 1,
      "cognitive_level": "analysis",
      "difficulty": "average"
    }}
  ],
  "identification": [
    {{
      "question": "Question here?",
      "correct_answer": "Answer here",
      "points": 1,
      "cognitive_level": "application",
      "difficulty": "easy"
    }}
  ]
}}

IMPORTANT: 
- Return ONLY the JSON object, no markdown
- Choice text should NOT include letter prefixes
- cognitive_level must be one of: remembering, understanding, application, analysis, evaluation, creating
- difficulty must be one of: easy, average, difficult
- Follow the EXACT distribution: {distribution}
- ALL questions and choices must be about CONTENT/CONCEPTS only
"""

                # ✅ SANITIZE PROMPT BEFORE SENDING TO GEMINI
                prompt = sanitize_text(prompt)

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

                # Clean JSON from markdown wrappers
                response_text = re.sub(r'^```json\s*', '', response_text)
                response_text = re.sub(r'^```\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)
                response_text = response_text.strip()

                quiz_data = json.loads(response_text)

                # Clean up choice prefixes
                for mc in quiz_data.get("multiple_choice", []):
                    cleaned_choices = []
                    for choice_text in mc["choices"]:
                        cleaned = re.sub(r'^[A-D]\.\s*', '', choice_text).strip()
                        cleaned_choices.append(cleaned)
                    mc["choices"] = cleaned_choices

                # Validate structure
                if not all(key in quiz_data for key in ["multiple_choice", "true_false", "identification"]):
                    raise ValueError("Invalid quiz data structure")

                # ✅ VALIDATE QUESTION QUALITY
                print("🔍 Validating question quality...")
                quiz_data = validate_and_filter_questions(quiz_data)

                # Verify and rebalance using BERT classifier
                quiz_data = verify_and_rebalance_questions(quiz_data, distribution)

                # Check distribution
                actual_dist = count_cognitive_levels(quiz_data)
                print(f"✅ Quiz generated with distribution:")
                print(f"   LOTS (60%): Remembering={actual_dist['remembering']}, Understanding={actual_dist['understanding']}, Application={actual_dist['application']}")
                print(f"   HOTS (40%): Analysis={actual_dist['analysis']}, Evaluation={actual_dist['evaluation']}, Creating={actual_dist['creating']}")

                return quiz_data

            except json.JSONDecodeError as e:
                print(f"⚠️ JSON Parse Error: {e}")
                raise Exception("Failed to parse Gemini response.")
            except Exception as e:
                error_message = str(e)
                print(f"🚫 Gemini API Error (Attempt {attempt+1}/{max_attempts}): {error_message}")

                if any(code in error_message.lower() for code in ["429", "quota", "permission", "key", "unauthorized"]):
                    print("🔄 Rotating to next API key...")
                    settings.rotate_key()
                    _configure_gemini()
                    attempt += 1
                    time.sleep(2)
                    continue
                else:
                    raise Exception(f"Gemini error: {error_message}")

    raise Exception("❌ All API keys exhausted.")


def validate_and_filter_questions(quiz_data: dict) -> dict:
    """
    Filter out questions that reference document structure.
    """
    validated_data = {
        "multiple_choice": [],
        "true_false": [],
        "identification": []
    }

    rejected_count = 0

    for mc in quiz_data.get("multiple_choice", []):
        is_valid, reason = validate_question_quality(mc["question"], mc["choices"])
        if is_valid:
            validated_data["multiple_choice"].append(mc)
        else:
            print(f"⚠️ Rejected MC: {mc['question'][:60]}... ({reason})")
            rejected_count += 1

    for tf in quiz_data.get("true_false", []):
        is_valid, reason = validate_question_quality(tf["question"])
        if is_valid:
            validated_data["true_false"].append(tf)
        else:
            print(f"⚠️ Rejected T/F: {tf['question'][:60]}... ({reason})")
            rejected_count += 1

    for id_q in quiz_data.get("identification", []):
        is_valid, reason = validate_question_quality(id_q["question"])
        if is_valid:
            validated_data["identification"].append(id_q)
        else:
            print(f"⚠️ Rejected ID: {id_q['question'][:60]}... ({reason})")
            rejected_count += 1

    if rejected_count > 0:
        print(f"⚠️ Total rejected: {rejected_count} low-quality questions")

    return validated_data


def count_cognitive_levels(quiz_data: dict) -> dict:
    """Count questions per Bloom's level"""
    counts = {
        "remembering": 0,
        "understanding": 0,
        "application": 0,
        "analysis": 0,
        "evaluation": 0,
        "creating": 0
    }

    for q_type in ["multiple_choice", "true_false", "identification"]:
        for q in quiz_data.get(q_type, []):
            level = q.get("cognitive_level", "remembering").lower()
            if level in counts:
                counts[level] += 1

    return counts


def verify_and_rebalance_questions(quiz_data: dict, target_distribution: dict) -> dict:
    """
    Verify cognitive levels using BERT classifier and adjust if needed.
    Maps BERT's LOTS/HOTS to specific Bloom's levels.
    """
    all_questions = []
    question_metadata = []

    for q_type in ["multiple_choice", "true_false", "identification"]:
        for idx, q in enumerate(quiz_data.get(q_type, [])):
            all_questions.append(q["question"])
            question_metadata.append({
                "type": q_type,
                "index": idx,
                "declared_level": q.get("cognitive_level", "remembering")
            })

    # ✅ Guard: skip classification if no questions survived filtering
    if not all_questions:
        print("⚠️ No questions to classify after filtering.")
        return quiz_data

    classifications = classify_multiple_questions(all_questions)

    for i, (classification, confidence) in enumerate(classifications):
        meta = question_metadata[i]
        q_type = meta["type"]
        q_idx = meta["index"]
        declared_level = meta["declared_level"].lower()

        if classification == "LOTS":
            adjusted_level = declared_level if declared_level in ["remembering", "understanding", "application"] else "application"
        else:  # HOTS
            adjusted_level = declared_level if declared_level in ["analysis", "evaluation", "creating"] else "analysis"

        quiz_data[q_type][q_idx]["cognitive_level"] = adjusted_level

        if adjusted_level in ["remembering", "understanding", "application"]:
            quiz_data[q_type][q_idx]["difficulty"] = "easy"
        elif adjusted_level in ["analysis", "evaluation"]:
            quiz_data[q_type][q_idx]["difficulty"] = "average"
        else:
            quiz_data[q_type][q_idx]["difficulty"] = "difficult"

    return quiz_data


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
            "points": mc.get("points", 2),
            "cognitive_level": mc.get("cognitive_level", "remembering"),
            "difficulty": mc.get("difficulty", "easy")
        })
        total_points += mc.get("points", 2)

    for tf in quiz_data.get("true_false", []):
        questions.append({
            "type": "true_false",
            "question": tf["question"],
            "correct_answer": "True" if tf["correct_answer"] else "False",
            "points": tf.get("points", 1),
            "cognitive_level": tf.get("cognitive_level", "understanding"),
            "difficulty": tf.get("difficulty", "easy")
        })
        total_points += tf.get("points", 1)

    for id_q in quiz_data.get("identification", []):
        questions.append({
            "type": "identification",
            "question": id_q["question"],
            "correct_answer": id_q["correct_answer"],
            "points": id_q.get("points", 2),
            "cognitive_level": id_q.get("cognitive_level", "remembering"),
            "difficulty": id_q.get("difficulty", "easy")
        })
        total_points += id_q.get("points", 2)

    return {
        "title": title,
        "questions": questions,
        "total_points": total_points
    }