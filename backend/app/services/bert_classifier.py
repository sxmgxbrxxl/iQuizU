# app/services/bert_classifier.py

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

# Load pre-trained BERT model (lightweight and fast)
print("Loading BERT model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("BERT model loaded successfully!")

# Generate reference embeddings at startup (do this once)
LOTS_KEYWORDS = get_lots_keywords()
HOTS_KEYWORDS = get_hots_keywords()

print(f"Generating embeddings for {len(LOTS_KEYWORDS)} LOTS keywords...")
lots_embeddings = model.encode(LOTS_KEYWORDS)

print(f"Generating embeddings for {len(HOTS_KEYWORDS)} HOTS keywords...")
hots_embeddings = model.encode(HOTS_KEYWORDS)

print("✓ BERT classification ready!")


def classify_question(question_text):
    """
    Classify a question as LOTS or HOTS using BERT embeddings
    
    Args:
        question_text (str): The question to classify
        
    Returns:
        tuple: (classification, confidence_score)
        - classification: "LOTS" or "HOTS"
        - confidence_score: float between 0 and 1
    """
    
    if not question_text or not question_text.strip():
        return "LOTS", 0.5  # Default for empty questions
    
    # Generate embedding for the question
    question_embedding = model.encode([question_text])[0]
    
    # Compute average similarity with LOTS keywords
    lots_similarities = cosine_similarity([question_embedding], lots_embeddings)
    lots_score = np.mean(lots_similarities)
    
    # Compute average similarity with HOTS keywords
    hots_similarities = cosine_similarity([question_embedding], hots_embeddings)
    hots_score = np.mean(hots_similarities)
    
    # Determine classification based on higher score
    if hots_score > lots_score:
        classification = "HOTS"
        confidence = float(hots_score)
    else:
        classification = "LOTS"
        confidence = float(lots_score)
    
    return classification, confidence


def classify_multiple_questions(questions_list):
    """
    Classify multiple questions at once (more efficient)
    
    Args:
        questions_list (list): List of question strings
        
    Returns:
        list: List of tuples [(classification, confidence), ...]
    """
    
    if not questions_list:
        return []
    
    # Generate embeddings for all questions at once
    question_embeddings = model.encode(questions_list)
    
    results = []
    for question_embedding in question_embeddings:
        # Compute similarities
        lots_similarities = cosine_similarity([question_embedding], lots_embeddings)
        lots_score = np.mean(lots_similarities)
        
        hots_similarities = cosine_similarity([question_embedding], hots_embeddings)
        hots_score = np.mean(hots_similarities)
        
        # Determine classification
        if hots_score > lots_score:
            classification = "HOTS"
            confidence = float(hots_score)
        else:
            classification = "LOTS"
            confidence = float(lots_score)
        
        results.append((classification, confidence))
    
    return results


def get_detailed_classification(question_text):
    """
    Get detailed classification with scores for both categories
    
    Args:
        question_text (str): The question to classify
        
    Returns:
        dict: Detailed classification info
    """
    
    if not question_text or not question_text.strip():
        return {
            "classification": "LOTS",
            "confidence": 0.5,
            "lots_score": 0.5,
            "hots_score": 0.5,
            "difference": 0.0
        }
    
    # Generate embedding
    question_embedding = model.encode([question_text])[0]
    
    # Compute scores
    lots_similarities = cosine_similarity([question_embedding], lots_embeddings)
    lots_score = float(np.mean(lots_similarities))
    
    hots_similarities = cosine_similarity([question_embedding], hots_embeddings)
    hots_score = float(np.mean(hots_similarities))
    
    # Determine classification
    if hots_score > lots_score:
        classification = "HOTS"
        confidence = hots_score
    else:
        classification = "LOTS"
        confidence = lots_score
    
    return {
        "classification": classification,
        "confidence": confidence,
        "lots_score": lots_score,
        "hots_score": hots_score,
        "difference": abs(hots_score - lots_score)
    }


# Test the classifier when module is run directly
if __name__ == "__main__":
    # Test questions
    test_questions = [
        "What is the capital of France?",  # LOTS - Remember
        "Compare and contrast the French and American revolutions.",  # HOTS - Analyze
        "Define photosynthesis.",  # LOTS - Remember
        "Design an experiment to test the effects of temperature on plant growth.",  # HOTS - Create
        "Calculate the area of a rectangle with length 5 and width 3.",  # LOTS - Apply
    ]
    
    print("\n" + "="*60)
    print("TESTING BERT CLASSIFIER")
    print("="*60)
    
    for i, question in enumerate(test_questions, 1):
        result = get_detailed_classification(question)
        print(f"\n{i}. {question}")
        print(f"   Classification: {result['classification']}")
        print(f"   Confidence: {result['confidence']:.4f}")
        print(f"   LOTS Score: {result['lots_score']:.4f}")
        print(f"   HOTS Score: {result['hots_score']:.4f}")
        print(f"   Difference: {result['difference']:.4f}")