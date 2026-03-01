"""Learning system for AI agent"""

import json
import sqlite3
from typing import Dict, List, Tuple
import datetime


class LearningSystem:
    """System for continuous learning"""
    
    def __init__(self, db_path: str = 'ai_assistant.db'):
        self.db_path = db_path
        self.init_learning_tables()
    
    def init_learning_tables(self):
        """Initialize learning tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learn_interactions (
                id INTEGER PRIMARY KEY,
                input_text TEXT,
                output_text TEXT,
                user_rating INTEGER,
                timestamp TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learn_preferences (
                preference TEXT PRIMARY KEY,
                value TEXT,
                confidence REAL DEFAULT 0.5
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learn_errors (
                id INTEGER PRIMARY KEY,
                error_text TEXT,
                context TEXT,
                timestamp TEXT,
                resolved BOOLEAN DEFAULT FALSE
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def record_interaction(self, input_text: str, output_text: str, rating: int = 0):
        """Record user interaction for learning"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO learn_interactions (input_text, output_text, user_rating, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (input_text, output_text, rating, datetime.datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        # Update preferences based on rating
        if rating >= 4:
            self.learn_preference_from_input(input_text)
    
    def learn_preference_from_input(self, user_input: str):
        """Learn user preferences from input"""
        words = user_input.lower().split()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for word in words:
            if len(word) > 3:
                cursor.execute('''
                    INSERT OR REPLACE INTO learn_preferences 
                    (preference, confidence)
                    VALUES (?, COALESCE((SELECT confidence FROM learn_preferences 
                                        WHERE preference = ?), 0) + 0.1)
                ''', (word, word))
        
        conn.commit()
        conn.close()
    
    def record_error(self, error_text: str, context: Dict = None):
        """Record errors for improvement"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO learn_errors (error_text, context, timestamp)
            VALUES (?, ?, ?)
        ''', (error_text, json.dumps(context or {}), 
              datetime.datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def get_learning_progress(self) -> Dict:
        """Get learning statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*), AVG(user_rating) FROM learn_interactions')
        interactions = cursor.fetchone()
        
        cursor.execute('SELECT COUNT(*) FROM learn_preferences WHERE confidence > 0.5')
        preferences = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM learn_errors WHERE resolved = FALSE')
        unresolved_errors = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_interactions': interactions[0],
            'average_rating': interactions[1] or 0,
            'learned_preferences': preferences,
            'unresolved_errors': unresolved_errors
        }
    
    def get_top_learnings(self, limit: int = 10) -> List[Tuple[str, float]]:
        """Get most important learned preferences"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT preference, confidence FROM learn_preferences
            ORDER BY confidence DESC
            LIMIT ?
        ''', (limit,))
        
        results = cursor.fetchall()
        conn.close()
        
        return results
