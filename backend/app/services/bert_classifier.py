"""
BERT-based LOTS/HOTS Classification Service
Uses sentence embeddings and cosine similarity
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import sys
import os

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.blooms_taxonomy import get_lots_keywords, get_hots_keywords

# -----------------------------
# Load BERT modelz
# -----------------------------
model = SentenceTransformer('all-MiniLM-L6-v2')

# Precompute keyword embeddings
LOTS_KEYWORDS = get_lots_keywords()
HOTS_KEYWORDS = get_hots_keywords()

lots_embeddings = model.encode(LOTS_KEYWORDS, convert_to_numpy=True)
hots_embeddings = model.encode(HOTS_KEYWORDS, convert_to_numpy=True)

# -----------------------------
# Helper Functions
# -----------------------------

def classify_question(question_text):
    """
    Classify a single question as LOTS or HOTS
    Returns: (classification, confidence)
    """
    if not question_text or not question_text.strip():
        return "LOTS", 0.5

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

    # Generate embeddings for all questions
    question_embeddings = model.encode(questions_list, convert_to_numpy=True)

    # Compute similarities in a vectorized way
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


def get_detailed_classification(question_text):
    """
    Returns detailed classification with scores for both categories
    """
    if not question_text or not question_text.strip():
        return {
            "classification": "LOTS",
            "confidence": 0.5,
            "lots_score": 0.5,
            "hots_score": 0.5,
            "difference": 0.0
        }

    question_embedding = model.encode([question_text], convert_to_numpy=True)[0]

    lots_score = float(np.mean(cosine_similarity([question_embedding], lots_embeddings)))
    hots_score = float(np.mean(cosine_similarity([question_embedding], hots_embeddings)))

    classification = "HOTS" if hots_score > lots_score else "LOTS"
    confidence = max(lots_score, hots_score)

    return {
        "classification": classification,
        "confidence": confidence,
        "lots_score": lots_score,
        "hots_score": hots_score,
        "difference": abs(hots_score - lots_score)
    }


# -----------------------------
# Test block
# -----------------------------
if __name__ == "__main__":
    test_questions = [
        "What is the capital of France?",  # LOTS - Remember
        "Compare and contrast the French and American revolutions.",  # HOTS - Analyze
        "Define photosynthesis.",  # LOTS - Remember
        "Design an experiment to test the effects of temperature on plant growth.",  # HOTS - Create
        "Calculate the area of a rectangle with length 5 and width 3.",  # LOTS - Apply
    ]

    for i, question in enumerate(test_questions, 1):
        result = get_detailed_classification(question)
        print(f"\n{i}. {question}")
        print(f"   Classification: {result['classification']}")
        print(f"   Confidence: {result['confidence']:.4f}")
        print(f"   LOTS Score: {result['lots_score']:.4f}")
        print(f"   HOTS Score: {result['hots_score']:.4f}")
        print(f"   Difference: {result['difference']:.4f}")
