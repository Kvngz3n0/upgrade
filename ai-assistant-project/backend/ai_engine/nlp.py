"""NLP utilities for AI agent"""

import re
from typing import List, Dict, Tuple


class NLPProcessor:
    """Natural Language Processing utilities"""
    
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being'
    }
    
    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Split text into tokens"""
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', '', text)
        return text.split()
    
    @staticmethod
    def remove_stop_words(tokens: List[str]) -> List[str]:
        """Remove common stop words"""
        return [t for t in tokens if t not in NLPProcessor.STOP_WORDS]
    
    @staticmethod
    def extract_keywords(text: str) -> List[str]:
        """Extract important keywords"""
        tokens = NLPProcessor.tokenize(text)
        keywords = NLPProcessor.remove_stop_words(tokens)
        return list(set(keywords))  # Remove duplicates
    
    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        """Calculate text similarity 0-1"""
        words1 = set(NLPProcessor.extract_keywords(text1))
        words2 = set(NLPProcessor.extract_keywords(text2))
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        return intersection / union
    
    @staticmethod
    def detect_intent(text: str) -> str:
        """Detect user intent"""
        text_lower = text.lower()
        
        intent_patterns = {
            'greeting': ['hello', 'hi', 'hey', 'greet'],
            'question': ['what', 'why', 'how', 'when', 'where', '?'],
            'command': ['do', 'make', 'create', 'show', 'tell'],
            'statement': ['.'],
            'emotion': ['happy', 'sad', 'angry', 'excited']
        }
        
        for intent, patterns in intent_patterns.items():
            if any(p in text_lower for p in patterns):
                return intent
        
        return 'unknown'
    
    @staticmethod
    def extract_entities(text: str) -> Dict[str, List[str]]:
        """Extract named entities"""
        entities = {
            'names': [],
            'numbers': [],
            'urls': []
        }
        
        # Simple entity extraction
        # Names (capitalized words)
        words = text.split()
        for word in words:
            if word[0].isupper() and word not in ['I', 'The', 'A']:
                entities['names'].append(word)
        
        # Numbers
        numbers = re.findall(r'\d+', text)
        entities['numbers'] = numbers
        
        # URLs
        urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
        entities['urls'] = urls
        
        return entities
