"""Context inspector for web data and AI decision making"""

import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ContextWindow:
    """Single context item"""
    type: str  # 'web', 'memory', 'fact', 'image'
    source: str
    content: str
    timestamp: str
    relevance_score: float = 1.0


class ContextInspector:
    """Inspect and analyze context for AI decision making"""
    
    def __init__(self, max_context_items: int = 20):
        """Initialize context inspector
        
        Args:
            max_context_items: Maximum context items to track
        """
        self.max_context_items = max_context_items
        self.context_history: List[ContextWindow] = []
    
    def add_context(self, context_type: str, source: str, content: str, 
                   relevance: float = 1.0, timestamp: str = None) -> None:
        """Add context item
        
        Args:
            context_type: Type of context (web, memory, fact, image)
            source: Source of context (URL, memory key, etc)
            content: Actual content
            relevance: Relevance score 0-1
            timestamp: ISO timestamp
        """
        from datetime import datetime
        
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        context_item = ContextWindow(
            type=context_type,
            source=source,
            content=content,
            timestamp=timestamp,
            relevance_score=relevance
        )
        
        self.context_history.append(context_item)
        
        # Keep size limit
        if len(self.context_history) > self.max_context_items:
            self.context_history.pop(0)
        
        logger.debug(f"Added {context_type} context from {source}")
    
    def get_relevant_context(self, query: str, context_types: List[str] = None,
                           limit: int = 5) -> List[Dict[str, Any]]:
        """Get relevant context items based on query
        
        Args:
            query: Search query
            context_types: Types to filter by (None = all)
            limit: Max items to return
            
        Returns:
            List of relevant context items
        """
        relevant = []
        
        for context in self.context_history:
            # Filter by type if specified
            if context_types and context.type not in context_types:
                continue
            
            # Calculate relevance
            relevance = self._calculate_relevance(query, context.content)
            
            if relevance > 0:
                relevant.append({
                    'type': context.type,
                    'source': context.source,
                    'content': context.content[:500],  # Limit content
                    'timestamp': context.timestamp,
                    'relevance': relevance * context.relevance_score
                })
        
        # Sort by relevance and limit
        relevant.sort(key=lambda x: x['relevance'], reverse=True)
        return relevant[:limit]
    
    def build_context_prompt(self, user_input: str, web_data: Dict = None,
                            memories: Dict = None) -> str:
        """Build enhanced prompt with context
        
        Args:
            user_input: User message
            web_data: Retrieved web data (optional)
            memories: Retrieved memories (optional)
            
        Returns:
            Enhanced prompt with context
        """
        prompt = f"User input: {user_input}\n\n"
        
        # Add web context
        if web_data:
            prompt += self._format_web_context(web_data)
        
        # Add memories
        if memories:
            prompt += self._format_memories(memories)
        
        # Add recent interactions
        recent = self.get_relevant_context(user_input, limit=3)
        if recent:
            prompt += "\nRecent relevant context:\n"
            for item in recent:
                prompt += f"- [{item['type']}] {item['source']}: {item['content'][:200]}\n"
        
        return prompt
    
    def analyze_web_data(self, web_data: Dict) -> Dict[str, Any]:
        """Analyze fetched web data for relevance
        
        Args:
            web_data: Web data from WebFetcher
            
        Returns:
            Analysis results
        """
        analysis = {
            'url': web_data.get('url'),
            'title': web_data.get('title'),
            'has_content': bool(web_data.get('text_content')),
            'content_length': len(web_data.get('text_content', '')),
            'image_count': len(web_data.get('images', [])),
            'link_count': len(web_data.get('links', [])),
            'quality_score': 0.0
        }
        
        # Calculate quality score
        score = 0.0
        if analysis['has_content']:
            score += 0.3
        if analysis['image_count'] > 0:
            score += 0.2
        if analysis['link_count'] > 0:
            score += 0.2
        if 'keyword_matches' in web_data and web_data['keyword_matches']:
            score += 0.3
        
        analysis['quality_score'] = min(score, 1.0)
        
        return analysis
    
    def should_fetch_web(self, user_input: str, available_memory: bool = False) -> bool:
        """Determine if web data should be fetched
        
        Args:
            user_input: User message
            available_memory: Whether relevant memory exists
            
        Returns:
            True if web fetch recommended
        """
        indicators = [
            'what', 'how', 'tell', 'find', 'search', 'look up',
            'current', 'latest', 'recent', 'today', 'now', 'news',
            'check', 'weather', 'price', 'quote'
        ]
        
        input_lower = user_input.lower()
        
        # Check for web query indicators
        has_query_indicator = any(indicator in input_lower for indicator in indicators)
        
        # Recommend web fetch if:
        # 1. Query indicator present and no memory available, OR
        # 2. Explicitly asking for current info
        if has_query_indicator and not available_memory:
            return True
        
        if any(phrase in input_lower for phrase in ['current', 'latest', 'today', 'now']):
            return True
        
        return False
    
    @staticmethod
    def _calculate_relevance(query: str, content: str) -> float:
        """Calculate relevance score between query and content
        
        Args:
            query: Search query
            content: Content to match
            
        Returns:
            Relevance score 0-1
        """
        query_lower = query.lower()
        content_lower = content.lower()
        
        # Count keyword hits
        query_words = query_lower.split()
        hits = sum(1 for word in query_words if len(word) > 2 and word in content_lower)
        
        # Normalize
        if not query_words:
            return 0.0
        
        return min(hits / len(query_words), 1.0)
    
    @staticmethod
    def _format_web_context(web_data: Dict) -> str:
        """Format web data for prompt inclusion"""
        text = "\n=== Web Context ===\n"
        text += f"Title: {web_data.get('title', 'N/A')}\n"
        
        if web_data.get('text_content'):
            text += f"Content: {web_data.get('text_content', '')[:300]}...\n"
        
        if web_data.get('images'):
            text += f"Images found: {len(web_data.get('images', []))}\n"
        
        if web_data.get('keyword_matches'):
            text += "Relevant excerpts:\n"
            for match in web_data['keyword_matches'][:3]:
                text += f"  - {match['context'][:150]}...\n"
        
        return text
    
    @staticmethod
    def _format_memories(memories: Dict) -> str:
        """Format memories for prompt inclusion"""
        text = "\n=== Related Memories ===\n"
        
        for key, item in memories.items():
            if isinstance(item, dict) and 'value' in item:
                text += f"- {key}: {item['value']}\n"
            else:
                text += f"- {key}: {item}\n"
        
        return text
    
    def get_context_summary(self) -> Dict[str, Any]:
        """Get summary of current context"""
        by_type = {}
        
        for context in self.context_history:
            if context.type not in by_type:
                by_type[context.type] = 0
            by_type[context.type] += 1
        
        return {
            'total_items': len(self.context_history),
            'by_type': by_type,
            'max_items': self.max_context_items
        }
    
    def clear_context(self):
        """Clear all context"""
        self.context_history = []
        logger.info("Context cleared")
