import google.generativeai as genai
from app.config.settings import settings
import json
import re
import time
import sys
import os
import math

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
    lots_total = round(total_questions * 0.60)
    hots_total = total_questions - lots_total

    remembering = round(total_questions * 0.10)
    understanding = round(total_questions * 0.20)
    application = lots_total - remembering - understanding

    analysis = round(total_questions * 0.15)
    evaluation = round(total_questions * 0.15)
    creating = hots_total - analysis - evaluation

    return {
        "remembering": max(0, remembering),
        "understanding": max(0, understanding),
        "application": max(0, application),
        "analysis": max(0, analysis),
        "evaluation": max(0, evaluation),
        "creating": max(0, creating)
    }


# ---------------------------------------------------------------------------
# BATCH SIZE for bulk generation
# ---------------------------------------------------------------------------
MAX_QUESTIONS_PER_BATCH = 25  # Safe limit per single Gemini call


def _generate_single_batch(
    cleaned_text: str,
    batch_mc: int,
    batch_tf: int,
    batch_id: int,
    batch_number: int,
    total_batches: int,
) -> dict:
    """
    Generate a single batch of questions via Gemini.
    Returns raw quiz_data dict with multiple_choice / true_false / identification lists.
    """
    total_questions = batch_mc + batch_tf + batch_id
    if total_questions == 0:
        return {"multiple_choice": [], "true_false": [], "identification": []}

    distribution = calculate_blooms_distribution(total_questions)

    # Use more source text for bigger quizzes (up to 12 000 chars)
    text_limit = min(len(cleaned_text), 12000)
    source_text = cleaned_text[:text_limit]

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
{source_text}

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
- {batch_mc} Multiple Choice (all cognitive levels)
- {batch_tf} True/False (all cognitive levels)
- {batch_id} Identification (all cognitive levels)

This is batch {batch_number} of {total_batches}. Generate UNIQUE questions that are different from any previous batch.
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
                    "max_output_tokens": 65536,
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

                return quiz_data

            except json.JSONDecodeError as e:
                print(f"⚠️ Batch {batch_number} JSON Parse Error: {e}")
                if generation_attempt < max_generation_attempts - 1:
                    print(f"🔄 Retrying batch {batch_number} (attempt {generation_attempt + 2}/{max_generation_attempts})...")
                    break  # Break inner while, continue outer for-loop to retry
                raise Exception(f"Failed to parse Gemini response for batch {batch_number}.")
            except Exception as e:
                error_message = str(e)
                print(f"Gemini API Error batch {batch_number} (Attempt {attempt+1}/{max_attempts}): {error_message}")

                if any(code in error_message.lower() for code in ["429", "quota", "permission", "key", "unauthorized"]):
                    print("🔄 Rotating to next API key...")
                    settings.rotate_key()
                    _configure_gemini()
                    attempt += 1
                    time.sleep(2)
                    continue
                else:
                    raise Exception(f"Gemini error: {error_message}")

    raise Exception(f"❌ All API keys exhausted on batch {batch_number}.")


def _split_into_batches(total: int, batch_size: int) -> list:
    """Split a total count into a list of batch sizes."""
    if total <= 0:
        return []
    batches = []
    remaining = total
    while remaining > 0:
        chunk = min(remaining, batch_size)
        batches.append(chunk)
        remaining -= chunk
    return batches


def generate_quiz_from_text(
    text: str,
    num_multiple_choice: int = 5,
    num_true_false: int = 5,
    num_identification: int = 5
) -> dict:
    """
    Generates a balanced quiz following Bloom's Taxonomy distribution.
    60% LOTS (Easy) / 40% HOTS (Average-Difficulty)

    Supports bulk generation up to 100 per type (300 total) by splitting
    into smaller batches of ~25 questions each.

    Includes a top-up mechanism: if validation rejects some questions,
    extra replacement questions are generated to fill the gap.
    """
    # ✅ CLEAN AND SANITIZE THE TEXT FIRST
    print("🧹 Cleaning PDF text...")
    cleaned_text = clean_pdf_text(text)
    print(f"✅ Text cleaned: {len(text)} → {len(cleaned_text)} characters")

    total_questions = num_multiple_choice + num_true_false + num_identification

    # -----------------------------------------------------------------------
    # Decide whether we need batched generation
    # -----------------------------------------------------------------------
    if total_questions <= MAX_QUESTIONS_PER_BATCH:
        # Small quiz – single call (original fast path)
        print(f"📝 Generating {total_questions} questions in a single batch...")
        quiz_data = _generate_single_batch(
            cleaned_text, num_multiple_choice, num_true_false, num_identification,
            batch_number=1, total_batches=1
        )

        # Validate & rebalance
        print("🔍 Validating question quality...")
        quiz_data = validate_and_filter_questions(quiz_data)

        # Top-up for small quizzes too
        quiz_data = _top_up_if_needed(
            quiz_data, cleaned_text,
            num_multiple_choice, num_true_false, num_identification
        )

        distribution = calculate_blooms_distribution(
            len(quiz_data["multiple_choice"]) + len(quiz_data["true_false"]) + len(quiz_data["identification"])
        )
        quiz_data = verify_and_rebalance_questions(quiz_data, distribution)

        actual_dist = count_cognitive_levels(quiz_data)
        print(f"✅ Quiz generated with distribution:")
        print(f"   LOTS (60%): Remembering={actual_dist['remembering']}, Understanding={actual_dist['understanding']}, Application={actual_dist['application']}")
        print(f"   HOTS (40%): Analysis={actual_dist['analysis']}, Evaluation={actual_dist['evaluation']}, Creating={actual_dist['creating']}")
        return quiz_data

    # -----------------------------------------------------------------------
    # BULK generation – split each type into batches
    # -----------------------------------------------------------------------
    mc_batches = _split_into_batches(num_multiple_choice, MAX_QUESTIONS_PER_BATCH)
    tf_batches = _split_into_batches(num_true_false, MAX_QUESTIONS_PER_BATCH)
    id_batches = _split_into_batches(num_identification, MAX_QUESTIONS_PER_BATCH)

    # Pad shorter lists so we can zip them
    max_len = max(len(mc_batches), len(tf_batches), len(id_batches))
    mc_batches += [0] * (max_len - len(mc_batches))
    tf_batches += [0] * (max_len - len(tf_batches))
    id_batches += [0] * (max_len - len(id_batches))

    # Merge small batches: combine entries where individual counts are tiny
    combined_batches = []
    for i in range(max_len):
        mc_c, tf_c, id_c = mc_batches[i], tf_batches[i], id_batches[i]
        if mc_c + tf_c + id_c > 0:
            combined_batches.append((mc_c, tf_c, id_c))

    total_batches = len(combined_batches)
    print(f"📦 Bulk generation: {total_questions} questions in {total_batches} batches")

    merged_quiz = {"multiple_choice": [], "true_false": [], "identification": []}

    for batch_idx, (b_mc, b_tf, b_id) in enumerate(combined_batches, start=1):
        batch_total = b_mc + b_tf + b_id
        print(f"\n🔄 Batch {batch_idx}/{total_batches}: {b_mc} MC, {b_tf} TF, {b_id} ID ({batch_total} questions)")

        batch_data = _generate_single_batch(
            cleaned_text, b_mc, b_tf, b_id,
            batch_number=batch_idx, total_batches=total_batches
        )

        # Validate each batch individually
        batch_data = validate_and_filter_questions(batch_data)

        merged_quiz["multiple_choice"].extend(batch_data.get("multiple_choice", []))
        merged_quiz["true_false"].extend(batch_data.get("true_false", []))
        merged_quiz["identification"].extend(batch_data.get("identification", []))

        generated_so_far = (
            len(merged_quiz["multiple_choice"])
            + len(merged_quiz["true_false"])
            + len(merged_quiz["identification"])
        )
        print(f"   ✅ Batch {batch_idx} done — {generated_so_far}/{total_questions} total so far")

        # Small delay between batches to avoid rate-limiting
        if batch_idx < total_batches:
            time.sleep(1)

    # -----------------------------------------------------------------------
    # TOP-UP: generate replacements for rejected questions
    # -----------------------------------------------------------------------
    merged_quiz = _top_up_if_needed(
        merged_quiz, cleaned_text,
        num_multiple_choice, num_true_false, num_identification
    )

    # -----------------------------------------------------------------------
    # Final rebalance on the merged set
    # -----------------------------------------------------------------------
    final_total = (
        len(merged_quiz["multiple_choice"])
        + len(merged_quiz["true_false"])
        + len(merged_quiz["identification"])
    )
    distribution = calculate_blooms_distribution(final_total)
    merged_quiz = verify_and_rebalance_questions(merged_quiz, distribution)

    actual_dist = count_cognitive_levels(merged_quiz)
    print(f"\n✅ Bulk quiz generated — {final_total} questions total")
    print(f"   LOTS (60%): Remembering={actual_dist['remembering']}, Understanding={actual_dist['understanding']}, Application={actual_dist['application']}")
    print(f"   HOTS (40%): Analysis={actual_dist['analysis']}, Evaluation={actual_dist['evaluation']}, Creating={actual_dist['creating']}")

    return merged_quiz


def _top_up_if_needed(
    quiz_data: dict,
    cleaned_text: str,
    target_mc: int,
    target_tf: int,
    target_id: int,
    max_top_up_attempts: int = 2
) -> dict:
    """
    Check if any question type has fewer questions than requested (due to
    validation rejecting low-quality questions). If so, generate replacement
    questions in a small top-up batch and validate them again.

    Tries up to `max_top_up_attempts` rounds to fill the gaps.
    """
    for attempt in range(max_top_up_attempts):
        mc_gap = max(0, target_mc - len(quiz_data.get("multiple_choice", [])))
        tf_gap = max(0, target_tf - len(quiz_data.get("true_false", [])))
        id_gap = max(0, target_id - len(quiz_data.get("identification", [])))

        total_gap = mc_gap + tf_gap + id_gap
        if total_gap == 0:
            return quiz_data  # All counts match — nothing to do

        print(f"\n🔧 Top-up attempt {attempt + 1}/{max_top_up_attempts}: "
              f"need {mc_gap} MC, {tf_gap} TF, {id_gap} ID ({total_gap} missing)")

        try:
            top_up_data = _generate_single_batch(
                cleaned_text, mc_gap, tf_gap, id_gap,
                batch_number=99, total_batches=99  # special marker for top-up
            )
            top_up_data = validate_and_filter_questions(top_up_data)

            quiz_data["multiple_choice"].extend(top_up_data.get("multiple_choice", []))
            quiz_data["true_false"].extend(top_up_data.get("true_false", []))
            quiz_data["identification"].extend(top_up_data.get("identification", []))

            new_mc = len(quiz_data["multiple_choice"])
            new_tf = len(quiz_data["true_false"])
            new_id = len(quiz_data["identification"])
            print(f"   ✅ After top-up: {new_mc} MC, {new_tf} TF, {new_id} ID")

        except Exception as e:
            print(f"   ⚠️ Top-up attempt {attempt + 1} failed: {e}")
            # Continue to next attempt or give up gracefully

    # Final trim — if top-up over-generated, trim to exact targets
    quiz_data["multiple_choice"] = quiz_data["multiple_choice"][:target_mc]
    quiz_data["true_false"] = quiz_data["true_false"][:target_tf]
    quiz_data["identification"] = quiz_data["identification"][:target_id]

    return quiz_data


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
    Verify cognitive levels based on Gemini's output and adjust difficulty.
    Bypasses the slow local BERT classifier and relies on the LLM's inherently good classification.
    We strictly enforce the 60/40 LOTS/HOTS distribution.
    """
    all_questions = []
    for q_type in ["multiple_choice", "true_false", "identification"]:
        for idx, q in enumerate(quiz_data.get(q_type, [])):
            all_questions.append((q_type, idx, q.get("cognitive_level", "remembering").lower()))

    total_remaining = len(all_questions)
    actual_target = calculate_blooms_distribution(total_remaining)

    level_pools = {
        "remembering": [],
        "understanding": [],
        "application": [],
        "analysis": [],
        "evaluation": [],
        "creating": []
    }
    
    for q_type, idx, declared_level in all_questions:
        if declared_level not in level_pools:
            declared_level = "remembering"
        level_pools[declared_level].append((q_type, idx))

    final_assignments = []
    
    for level, target_count in actual_target.items():
        while target_count > 0 and len(level_pools[level]) > 0:
            item = level_pools[level].pop()
            final_assignments.append((item[0], item[1], level))
            target_count -= 1
            
        while target_count > 0:
            for backup_level, pool in level_pools.items():
                if len(pool) > 0:
                    item = pool.pop()
                    final_assignments.append((item[0], item[1], level))
                    target_count -= 1
                    break
                    
    for q_type, idx, new_level in final_assignments:
        quiz_data[q_type][idx]["cognitive_level"] = new_level
        
        if new_level in ["remembering", "understanding", "application"]:
            quiz_data[q_type][idx]["difficulty"] = "easy"
            quiz_data[q_type][idx]["bloom_classification"] = "LOTS"
        elif new_level in ["analysis", "evaluation"]:
            quiz_data[q_type][idx]["difficulty"] = "average"
            quiz_data[q_type][idx]["bloom_classification"] = "HOTS"
        else:
            quiz_data[q_type][idx]["difficulty"] = "difficult"
            quiz_data[q_type][idx]["bloom_classification"] = "HOTS"

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
            "bloom_classification": mc.get("bloom_classification", "LOTS"),
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
            "bloom_classification": tf.get("bloom_classification", "LOTS"),
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
            "bloom_classification": id_q.get("bloom_classification", "LOTS"),
            "difficulty": id_q.get("difficulty", "easy")
        })
        total_points += id_q.get("points", 2)

    return {
        "title": title,
        "questions": questions,
        "total_points": total_points
    }