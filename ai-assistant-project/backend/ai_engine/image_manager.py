"""Image management system with storage and auto-cleanup"""

import os
import sqlite3
import shutil
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
import hashlib
import requests

logger = logging.getLogger(__name__)


class ImageManager:
    """Manage downloaded images with storage limits and auto-cleanup"""
    
    def __init__(self, storage_path: str = 'storage/images', db_path: str = 'ai_assistant.db', 
                 max_images: int = 10, ttl_hours: int = 24):
        """Initialize image manager
        
        Args:
            storage_path: Directory to store images
            db_path: Database path for tracking images
            max_images: Maximum images to store (default 10)
            ttl_hours: Time to live in hours (default 24)
        """
        self.storage_path = storage_path
        self.db_path = db_path
        self.max_images = max_images
        self.ttl_hours = ttl_hours
        
        # Create storage directory
        Path(storage_path).mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_db()
    
    def _init_db(self):
        """Initialize image tracking database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS images_stored (
                id TEXT PRIMARY KEY,
                url TEXT UNIQUE,
                filename TEXT,
                path TEXT,
                size_bytes INTEGER,
                created_at TEXT,
                expires_at TEXT,
                accessed_count INTEGER DEFAULT 0,
                last_accessed TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store_image(self, url: str) -> Optional[Dict[str, str]]:
        """Download and store image with limits
        
        Args:
            url: Image URL
            
        Returns:
            Image info dict or None if failed
        """
        try:
            # Check if already stored
            existing = self.get_image(url)
            if existing:
                self.update_access(url)
                return existing
            
            # Check limit
            if self._get_stored_count() >= self.max_images:
                # Delete oldest
                self._delete_oldest()
            
            # Download image
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Generate filename
            url_hash = hashlib.md5(url.encode()).hexdigest()
            ext = self._get_extension(response.headers.get('content-type', ''))
            filename = f"{url_hash}{ext}"
            filepath = os.path.join(self.storage_path, filename)
            
            # Save image
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            file_size = len(response.content)
            file_id = url_hash
            
            # Store metadata
            created_at = datetime.now().isoformat()
            expires_at = (datetime.now() + timedelta(hours=self.ttl_hours)).isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO images_stored 
                (id, url, filename, path, size_bytes, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (file_id, url, filename, filepath, file_size, created_at, expires_at))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Stored image: {filename} ({file_size} bytes)")
            
            return {
                'id': file_id,
                'url': url,
                'filename': filename,
                'path': filepath,
                'size_bytes': file_size,
                'created_at': created_at,
                'expires_at': expires_at
            }
        
        except Exception as e:
            logger.error(f"Failed to store image {url}: {str(e)}")
            return None
    
    def get_image(self, url: str) -> Optional[Dict[str, str]]:
        """Retrieve stored image info
        
        Args:
            url: Image URL
            
        Returns:
            Image info or None
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, url, filename, path, size_bytes, created_at, expires_at
            FROM images_stored WHERE url = ?
        ''', (url,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'id': result[0],
                'url': result[1],
                'filename': result[2],
                'path': result[3],
                'size_bytes': result[4],
                'created_at': result[5],
                'expires_at': result[6]
            }
        
        return None
    
    def get_all_images(self, limit: int = 10) -> List[Dict[str, str]]:
        """Get all stored images"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, url, filename, path, size_bytes, created_at, expires_at
            FROM images_stored
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
        
        results = cursor.fetchall()
        conn.close()
        
        return [{
            'id': r[0],
            'url': r[1],
            'filename': r[2],
            'path': r[3],
            'size_bytes': r[4],
            'created_at': r[5],
            'expires_at': r[6]
        } for r in results]
    
    def delete_image(self, url: str) -> bool:
        """Delete stored image
        
        Args:
            url: Image URL
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            image = self.get_image(url)
            if not image:
                return False
            
            # Delete file
            if os.path.exists(image['path']):
                os.remove(image['path'])
            
            # Delete from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM images_stored WHERE url = ?', (url,))
            conn.commit()
            conn.close()
            
            logger.info(f"Deleted image: {image['filename']}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to delete image: {str(e)}")
            return False
    
    def cleanup_expired(self) -> int:
        """Delete images that have expired
        
        Returns:
            Number of images deleted
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            # Find expired images
            cursor.execute('''
                SELECT id, path FROM images_stored WHERE expires_at < ?
            ''', (now,))
            
            expired = cursor.fetchall()
            deleted_count = 0
            
            for img_id, path in expired:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                    
                    cursor.execute('DELETE FROM images_stored WHERE id = ?', (img_id,))
                    deleted_count += 1
                    logger.info(f"Cleaned up expired image: {os.path.basename(path)}")
                
                except Exception as e:
                    logger.error(f"Error cleaning up image: {str(e)}")
            
            conn.commit()
            conn.close()
            
            return deleted_count
        
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")
            return 0
    
    def update_access(self, url: str):
        """Update last access time"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE images_stored
                SET accessed_count = accessed_count + 1,
                    last_accessed = ?
                WHERE url = ?
            ''', (datetime.now().isoformat(), url))
            
            conn.commit()
            conn.close()
        
        except Exception as e:
            logger.error(f"Access update error: {str(e)}")
    
    def _get_stored_count(self) -> int:
        """Get count of stored images"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM images_stored')
        count = cursor.fetchone()[0]
        
        conn.close()
        return count
    
    def _delete_oldest(self):
        """Delete oldest image when limit reached"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find oldest image
            cursor.execute('''
                SELECT id, path FROM images_stored
                ORDER BY created_at ASC LIMIT 1
            ''')
            
            result = cursor.fetchone()
            if result:
                img_id, path = result
                
                if os.path.exists(path):
                    os.remove(path)
                
                cursor.execute('DELETE FROM images_stored WHERE id = ?', (img_id,))
                logger.info(f"Deleted oldest image to make room: {os.path.basename(path)}")
            
            conn.commit()
            conn.close()
        
        except Exception as e:
            logger.error(f"Error deleting oldest image: {str(e)}")
    
    @staticmethod
    def _get_extension(content_type: str) -> str:
        """Get file extension from content type"""
        type_map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        }
        return type_map.get(content_type, '.jpg')
    
    def get_stats(self) -> Dict[str, any]:
        """Get storage statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*), SUM(size_bytes) FROM images_stored')
            count, total_size = cursor.fetchone()
            
            conn.close()
            
            return {
                'image_count': count or 0,
                'total_size_bytes': total_size or 0,
                'max_allowed': self.max_images,
                'ttl_hours': self.ttl_hours,
                'storage_path': self.storage_path
            }
        
        except Exception as e:
            logger.error(f"Stats error: {str(e)}")
            return {}
