"""Autonomous AI Agent - learns from user interactions"""

import json
import sqlite3
import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import hashlib
import logging

from .web_fetcher import WebFetcher
from .image_manager import ImageManager
from .context_inspector import ContextInspector
from .task_scheduler import TaskScheduler

logger = logging.getLogger(__name__)

@dataclass
class Message:
    """Message object"""
    id: str
    user_input: str
    ai_response: str
    timestamp: str
    context: Dict = None
    web_data: Dict = None
    images: List[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


class AutonomousAgent:
    """Main AI agent that learns from conversations"""
    
    def __init__(self, db_path: str = 'ai_assistant.db', enable_web: bool = True):
        self.db_path = db_path
        self.init_database()
        self.conversation_history: List[Message] = []
        self.personality = self.load_personality()
        
        # Initialize web capabilities
        self.web_fetcher = WebFetcher() if enable_web else None
        self.image_manager = ImageManager() if enable_web else None
        self.context_inspector = ContextInspector() if enable_web else None
        self.task_scheduler = TaskScheduler() if enable_web else None
        
        logger.info("AI Agent initialized with web capabilities" if enable_web else "AI Agent initialized")
        
    def init_database(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                user_input TEXT NOT NULL,
                ai_response TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                context TEXT
            )
        ''')
        
        # Learning patterns table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patterns (
                id INTEGER PRIMARY KEY,
                user_keyword TEXT UNIQUE,
                ai_response TEXT,
                frequency INTEGER DEFAULT 1,
                last_used TEXT
            )
        ''')
        
        # User profile table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_profile (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')
        
        # Personality traits table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personality (
                trait TEXT PRIMARY KEY,
                value REAL,
                timestamp TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def process_input(self, user_input: str, fetch_web: bool = None) -> Dict[str, Any]:
        """Process user input and generate response with optional web data
        
        Args:
            user_input: User message
            fetch_web: Override web fetching decision (True/False/None=auto)
            
        Returns:
            Dict with response, web_data, images
        """
        # Normalize input
        normalized = user_input.lower().strip()
        
        # Determine if web fetch needed
        need_web = fetch_web if fetch_web is not None else False
        web_data = None
        images = []
        
        if self.context_inspector and fetch_web is not False:
            need_web = self.context_inspector.should_fetch_web(user_input)
        
        # Fetch web data if needed
        if need_web and self.web_fetcher:
            # Extract URL if provided, otherwise search based on input
            url = self._extract_url(user_input)
            if url:
                web_data = self.web_fetcher.fetch_page(url)
                
                if web_data and self.image_manager:
                    # Store and limit images
                    for img in web_data.get('images', [])[:10]:
                        stored = self.image_manager.store_image(img['url'])
                        if stored:
                            images.append(stored)
                    
                    # Add to context
                    if self.context_inspector:
                        self.context_inspector.add_context(
                            'web',
                            url,
                            web_data.get('text_content', '')[:500]
                        )
        
        # Check for matching patterns
        response = self.find_matching_response(normalized)
        
        # If no pattern found, generate new response
        if not response:
            response = self.generate_response(user_input, web_data)
        
        # Store conversation
        message = Message(
            id=self._generate_id(user_input),
            user_input=user_input,
            ai_response=response,
            timestamp=datetime.datetime.now().isoformat(),
            context={'source': 'conversation', 'web_fetch': need_web},
            web_data=web_data,
            images=[img['filename'] for img in images] if images else None
        )
        
        self.save_message(message)
        self.learn_from_interaction(user_input, response)
        self.conversation_history.append(message)
        
        # Add to context
        if self.context_inspector:
            self.context_inspector.add_context(
                'message',
                'conversation',
                f"User: {user_input}\nAI: {response}"
            )
        
        return {
            'response': response,
            'web_data': web_data,
            'images': [img['url'] for img in images] if images else None,
            'timestamp': message.timestamp
        }
    
    def find_matching_response(self, user_input: str) -> Optional[str]:
        """Look up learned patterns"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Find keyword matches
        for keyword in user_input.split():
            if len(keyword) > 2:  # Skip short words
                cursor.execute(
                    'SELECT ai_response, frequency FROM patterns WHERE user_keyword = ?',
                    (keyword,)
                )
                result = cursor.fetchone()
                if result and result[1] > 2:  # Only use if learned multiple times
                    conn.close()
                    return result[0]
        
        conn.close()
        return None
    
    def generate_response(self, user_input: str, web_data: Dict = None) -> str:
        """Generate AI response using learned personality and optional web data"""
        # Extract intent from input
        intent = self.extract_intent(user_input)
        
        # Build base response
        if web_data and web_data.get('text_content'):
            # Use web data in response
            base_response = self._generate_web_response(user_input, web_data)
        else:
            # Generate response based on intent
            templates = {
                'greeting': "Hi there! How can I assist you today?",
                'question': f"That's an interesting question. Let me help you with that.",
                'statement': "I understand. Tell me more about that.",
                'command': f"Sure, I'll help you with that.",
                'unknown': "I'm learning! Could you elaborate on that?"
            }
            
            base_response = templates.get(intent, templates['unknown'])
        
        # Add personalization based on learned traits
        personality_boost = self.get_personality_response()
        
        return f"{base_response} {personality_boost}".strip()
    
    def extract_intent(self, user_input: str) -> str:
        """Determine user's intent"""
        input_lower = user_input.lower()
        
        greetings = ['hi', 'hello', 'hey', 'greetings', 'howdy']
        questions = ['what', 'how', 'why', 'when', 'where', 'who', '?']
        commands = ['please', 'can you', 'could you', 'help', 'do', 'make']
        
        if any(g in input_lower for g in greetings):
            return 'greeting'
        elif any(q in input_lower for q in questions):
            return 'question'
        elif any(c in input_lower for c in commands):
            return 'command'
        elif input_lower.endswith('.'):
            return 'statement'
        else:
            return 'unknown'
    
    def learn_from_interaction(self, user_input: str, ai_response: str):
        """Learn from successful interactions"""
        keywords = user_input.lower().split()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for keyword in keywords:
            if len(keyword) > 2:  # Skip short words
                cursor.execute('''
                    INSERT OR REPLACE INTO patterns 
                    (user_keyword, ai_response, frequency, last_used)
                    VALUES (?, ?, 
                        (SELECT COALESCE(frequency, 0) + 1 FROM patterns 
                         WHERE user_keyword = ?),
                        ?)
                ''', (keyword, ai_response[:100], keyword, datetime.datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        # Update personality based on interaction
        self.update_personality(user_input)
    
    def update_personality(self, user_input: str):
        """Evolve personality based on interactions"""
        # Analyze sentiment/tone and adjust personality
        sentiment_score = self.analyze_sentiment(user_input)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO personality (trait, value, timestamp)
            VALUES (?, 
                COALESCE((SELECT value FROM personality WHERE trait = ?), 0) + ?,
                ?)
        ''', ('responsiveness', 'responsiveness', sentiment_score * 0.1, 
              datetime.datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def analyze_sentiment(self, text: str) -> float:
        """Simple sentiment analysis (-1 to 1)"""
        positive_words = ['good', 'great', 'amazing', 'awesome', 'happy', 'love', 'thanks']
        negative_words = ['bad', 'terrible', 'awful', 'hate', 'angry', 'sad']
        
        text_lower = text.lower()
        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)
        
        return (pos_count - neg_count) / max(len(text.split()), 1)
    
    def get_personality_response(self) -> str:
        """Get personality-influenced response"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT AVG(value) FROM personality')
        avg_personality = cursor.fetchone()[0] or 0.0
        
        conn.close()
        
        if avg_personality > 0.5:
            return "I'm feeling quite positive about this!"
        elif avg_personality < -0.5:
            return "This feels important to understand."
        else:
            return ""
    
    def save_message(self, message: Message):
        """Store message in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO messages (id, user_input, ai_response, timestamp, context)
            VALUES (?, ?, ?, ?, ?)
        ''', (message.id, message.user_input, message.ai_response, 
              message.timestamp, json.dumps(message.context or {})))
        
        conn.commit()
        conn.close()
    
    def load_personality(self) -> Dict[str, float]:
        """Load personality traits from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT trait, value FROM personality')
        results = cursor.fetchall()
        conn.close()
        
        return {trait: value for trait, value in results}
    
    def get_conversation_history(self, limit: int = 50) -> List[Dict]:
        """Retrieve conversation history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, user_input, ai_response, timestamp, context
            FROM messages
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                'id': r[0],
                'user_input': r[1],
                'ai_response': r[2],
                'timestamp': r[3],
                'context': json.loads(r[4]) if r[4] else {}
            }
            for r in results
        ]
    
    def export_learning(self) -> Dict[str, Any]:
        """Export all learned data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT user_keyword, ai_response, frequency FROM patterns')
        patterns = [{
            'keyword': r[0],
            'response': r[1],
            'frequency': r[2]
        } for r in cursor.fetchall()]
        
        cursor.execute('SELECT trait, value FROM personality')
        personality = {r[0]: r[1] for r in cursor.fetchall()}
        
        conn.close()
        
        return {
            'patterns': patterns,
            'personality': personality,
            'export_date': datetime.datetime.now().isoformat()
        }
    
    def import_learning(self, learning_data: Dict[str, Any]):
        """Import learned data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for pattern in learning_data.get('patterns', []):
            cursor.execute('''
                INSERT OR REPLACE INTO patterns (user_keyword, ai_response, frequency)
                VALUES (?, ?, ?)
            ''', (pattern['keyword'], pattern['response'], pattern.get('frequency', 1)))
        
        for trait, value in learning_data.get('personality', {}).items():
            cursor.execute('''
                INSERT OR REPLACE INTO personality (trait, value, timestamp)
                VALUES (?, ?, ?)
            ''', (trait, value, datetime.datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def _extract_url(self, text: str) -> Optional[str]:
        """Extract URL from text"""
        import re
        url_pattern = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)'
        match = re.search(url_pattern, text)
        return match.group(0) if match else None
    
    def _generate_web_response(self, user_input: str, web_data: Dict) -> str:
        """Generate response informed by web data"""
        title = web_data.get('title', 'the website')
        content_snippet = web_data.get('text_content', '')[:200]
        
        if content_snippet:
            return f"Based on {title}: {content_snippet}... This is what I found related to your query."
        else:
            return f"I looked up information about {title} and found some relevant content for you."
    
    def get_web_context(self, query: str) -> Optional[Dict]:
        """Get web context for a query"""
        if not self.context_inspector:
            return None
        
        return {
            'should_fetch': self.context_inspector.should_fetch_web(query),
            'relevant_context': self.context_inspector.get_relevant_context(query),
            'summary': self.context_inspector.get_context_summary()
        }
    
    def get_image_stats(self) -> Dict:
        """Get image storage statistics"""
        if not self.image_manager:
            return {}
        
        return self.image_manager.get_stats()
    
    def cleanup_images(self) -> int:
        """Manually trigger image cleanup"""
        if not self.image_manager:
            return 0
        
        return self.image_manager.cleanup_expired()
    
    @staticmethod
    def _generate_id(content: str) -> str:
        """Generate unique ID"""
        return hashlib.md5((content + str(datetime.datetime.now())).encode()).hexdigest()[:16]
