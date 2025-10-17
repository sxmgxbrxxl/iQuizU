# app/utils/blooms_taxonomy.py

"""
Bloom's Taxonomy keyword definitions for LOTS/HOTS classification
"""

LOTS_KEYWORDS = [
    # Remember Level - Recall basic facts
    "identify", "define", "list", "name", "state", "label", 
    "recall", "recognize", "match", "select", "who", "what", 
    "when", "where", "which",
    
    # Understand Level - Explain ideas
    "explain", "summarize", "interpret", "classify", "describe",
    "discuss", "illustrate", "paraphrase", "restate", "translate",
    
    # Apply Level - Use information
    "compute", "calculate", "solve", "apply", "demonstrate",
    "use", "show", "complete", "examine", "modify", "implement"
]

HOTS_KEYWORDS = [
    # Analyze Level - Break down information
    "analyze", "compare and contrast", "differentiate", "examine",
    "distinguish", "investigate", "categorize", "infer", 
    "breakdown", "deconstruct", "organize", "separate",
    
    # Evaluate Level - Make judgments
    "evaluate", "assess", "justify", "critique", "argue",
    "defend", "judge", "rate", "validate", "support",
    "recommend", "prioritize", "prove", "disprove",
    
    # Create Level - Generate new ideas
    "create", "design", "formulate", "propose", "construct",
    "develop", "predict", "hypothesize", "compose", "plan",
    "generate", "devise", "why", "how would", "what if",
    "imagine", "invent", "synthesize"
]

def get_lots_keywords():
    """Return LOTS keywords list"""
    return LOTS_KEYWORDS

def get_hots_keywords():
    """Return HOTS keywords list"""
    return HOTS_KEYWORDS

def get_all_keywords():
    """Return dictionary with both categories"""
    return {
        "LOTS": LOTS_KEYWORDS,
        "HOTS": HOTS_KEYWORDS
    }