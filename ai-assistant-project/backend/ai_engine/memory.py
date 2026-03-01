"""Memory management for AI agent"""

import json
import sqlite3
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import datetime

@dataclass
class MemoryEntry:
    """Single memory entry"""
    key: str
    value: Any
    timestamp: str
    importance: float = 0.5  # 0-1 scale
    recall_count: int = 0


class Memory:
    """Persistent memory system"""
    
    def __init__(self, db_path: str = 'ai_assistant.db'):
        self.db_path = db_path
        self.short_term: Dict[str, Any] = {}
        self.init_memory_tables()
    
    def init_memory_tables(self):
        """Initialize memory tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory_long_term (
                key TEXT PRIMARY KEY,
                value TEXT,
                importance REAL DEFAULT 0.5,
                recall_count INTEGER DEFAULT 0,
                timestamp TEXT,
                last_accessed TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory_facts (
                id INTEGER PRIMARY KEY,
                subject TEXT,
                predicate TEXT,
                object TEXT,
                confidence REAL DEFAULT 1.0
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def remember(self, key: str, value: Any, importance: float = 0.5):
        """Store in long-term memory"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO memory_long_term 
            (key, value, importance, timestamp, last_accessed)
            VALUES (?, ?, ?, ?, ?)
        ''', (key, json.dumps(value), importance, 
              datetime.datetime.now().isoformat(),
              datetime.datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def recall(self, key: str) -> Optional[Any]:
        """Retrieve from memory"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE memory_long_term 
            SET recall_count = recall_count + 1, last_accessed = ?
            WHERE key = ?
        ''', (datetime.datetime.now().isoformat(), key))
        
        cursor.execute('SELECT value FROM memory_long_term WHERE key = ?', (key,))
        result = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        return json.loads(result[0]) if result else None
    
    def forget(self, key: str):
        """Remove from memory"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM memory_long_term WHERE key = ?', (key,))
        conn.commit()
        conn.close()
    
    def add_fact(self, subject: str, predicate: str, obj: str, confidence: float = 1.0):
        """Store a fact"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO memory_facts (subject, predicate, object, confidence)
            VALUES (?, ?, ?, ?)
        ''', (subject, predicate, obj, confidence))
        
        conn.commit()
        conn.close()
    
    def get_facts_about(self, subject: str) -> List[Dict]:
        """Retrieve facts about subject"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT predicate, object, confidence FROM memory_facts
            WHERE subject = ?
            ORDER BY confidence DESC
        ''', (subject,))
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {'predicate': r[0], 'object': r[1], 'confidence': r[2]}
            for r in results
        ]
    
    def get_all_memories(self) -> Dict[str, Any]:
        """Export all memories"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT key, value, importance FROM memory_long_term')
        memories = {r[0]: {'value': json.loads(r[1]), 'importance': r[2]} 
                   for r in cursor.fetchall()}
        
        cursor.execute('SELECT subject, predicate, object, confidence FROM memory_facts')
        facts = [{'subject': r[0], 'predicate': r[1], 'object': r[2], 'confidence': r[3]}
                for r in cursor.fetchall()]
        
        conn.close()
        
        return {'memories': memories, 'facts': facts}
