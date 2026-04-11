"""
BERT-based Bloom's Taxonomy Classification Service
Classifies questions into 6 cognitive levels with LOTS/HOTS grouping
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.blooms_taxonomy import (
    get_remembering_keywords, get_understanding_keywords, get_application_keywords,
    get_analysis_keywords, get_evaluation_keywords, get_creating_keywords,
    get_lots_keywords, get_hots_keywords, get_difficulty_mapping, get_lots_hots_mapping
)

# Globals for lazy loading
model = None
remembering_embeddings = None
understanding_embeddings = None
application_embeddings = None
analysis_embeddings = None
evaluation_embeddings = None
creating_embeddings = None
lots_embeddings = None
hots_embeddings = None

def _ensure_model_loaded():
    """Lazily load the SentenceTransformer model and precompute embeddings only when first requested."""
    global model, remembering_embeddings, understanding_embeddings, application_embeddings
    global analysis_embeddings, evaluation_embeddings, creating_embeddings, lots_embeddings, hots_embeddings
    
    if model is None:
        print("Lazy loading SentenceTransformer 'all-MiniLM-L6-v2'...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        remembering_embeddings = model.encode(get_remembering_keywords(), convert_to_numpy=True)
        understanding_embeddings = model.encode(get_understanding_keywords(), convert_to_numpy=True)
        application_embeddings = model.encode(get_application_keywords(), convert_to_numpy=True)
        analysis_embeddings = model.encode(get_analysis_keywords(), convert_to_numpy=True)
        evaluation_embeddings = model.encode(get_evaluation_keywords(), convert_to_numpy=True)
        creating_embeddings = model.encode(get_creating_keywords(), convert_to_numpy=True)
        
        lots_embeddings = model.encode(get_lots_keywords(), convert_to_numpy=True)
        hots_embeddings = model.encode(get_hots_keywords(), convert_to_numpy=True)
        print("SentenceTransformer loaded and embeddings cached.")


def classify_question_detailed(question_text):
    """
    Classify a question into one of 6 Bloom's levels
    Returns: (level, difficulty, lots_or_hots, confidence, all_scores)
    """
    if not question_text or not question_text.strip():
        return "remembering", "easy", "LOTS", 0.5, {}

    _ensure_model_loaded()

    question_embedding = model.encode([question_text], convert_to_numpy=True)[0]

    # Calculate similarity scores for all 6 levels
    scores = {
        "remembering": float(np.mean(cosine_similarity([question_embedding], remembering_embeddings))),
        "understanding": float(np.mean(cosine_similarity([question_embedding], understanding_embeddings))),
        "application": float(np.mean(cosine_similarity([question_embedding], application_embeddings))),
        "analysis": float(np.mean(cosine_similarity([question_embedding], analysis_embeddings))),
        "evaluation": float(np.mean(cosine_similarity([question_embedding], evaluation_embeddings))),
        "creating": float(np.mean(cosine_similarity([question_embedding], creating_embeddings)))
    }

    # Get the level with highest score
    cognitive_level = max(scores, key=scores.get)
    confidence = scores[cognitive_level]
    
    # Get difficulty and LOTS/HOTS classification
    difficulty_map = get_difficulty_mapping()
    lots_hots_map = get_lots_hots_mapping()
    
    difficulty = difficulty_map[cognitive_level]
    lots_or_hots = lots_hots_map[cognitive_level]

    return cognitive_level, difficulty, lots_or_hots, confidence, scores


def classify_question(question_text):
    """
    Classify a single question as LOTS or HOTS (simplified version)
    Returns: (classification, confidence)
    """
    if not question_text or not question_text.strip():
        return "LOTS", 0.5

    _ensure_model_loaded()

    question_embedding = model.encode([question_text], convert_to_numpy=True)[0]

    lots_score = np.mean(cosine_similarity([question_embedding], lots_embeddings))
    hots_score = np.mean(cosine_similarity([question_embedding], hots_embeddings))

    if hots_score > lots_score:
        return "HOTS", float(hots_score)
    return "LOTS", float(lots_score)


def classify_multiple_questions(questions_list):
    """
    Classify multiple questions at once (vectorized for speed)
    Returns: list of tuples [(classification, confidence), ...]
    """
    if not questions_list:
        return []

    _ensure_model_loaded()

    question_embeddings = model.encode(questions_list, convert_to_numpy=True)

    lots_sim_matrix = cosine_similarity(question_embeddings, lots_embeddings)
    hots_sim_matrix = cosine_similarity(question_embeddings, hots_embeddings)

    lots_scores = np.mean(lots_sim_matrix, axis=1)
    hots_scores = np.mean(hots_sim_matrix, axis=1)

    results = []
    for lots_score, hots_score in zip(lots_scores, hots_scores):
        if hots_score > lots_score:
            results.append(("HOTS", float(hots_score)))
        else:
            results.append(("LOTS", float(lots_score)))
    return results


def classify_multiple_questions_detailed(questions_list):
    """
    Classify multiple questions with full Bloom's taxonomy details
    Returns: list of dicts with level, difficulty, classification
    """
    if not questions_list:
        return []

    results = []
    for question in questions_list:
        level, difficulty, lots_hots, confidence, scores = classify_question_detailed(question)
        results.append({
            "cognitive_level": level,
            "difficulty": difficulty,
            "lots_or_hots": lots_hots,
            "confidence": confidence,
            "all_scores": scores
        })
    
    return results


def get_detailed_classification(question_text):
    """
    Returns detailed classification with all scores
    (Backwards compatible function name)
    """
    level, difficulty, lots_hots, confidence, scores = classify_question_detailed(question_text)
    
    return {
        "classification": lots_hots,
        "cognitive_level": level,
        "difficulty": difficulty,
        "confidence": confidence,
        "lots_score": np.mean([scores["remembering"], scores["understanding"], scores["application"]]),
        "hots_score": np.mean([scores["analysis"], scores["evaluation"], scores["creating"]]),
        "all_bloom_scores": scores,
        "difference": abs(scores[level] - np.mean(list(scores.values())))
    }