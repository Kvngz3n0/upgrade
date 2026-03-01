"""Media scraper module - optimized for cPanel"""

import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Optional
import json
import hashlib

class MediaScraper:
    """Extract and manage media files from web pages"""
    
    MEDIA_EXTENSIONS = {
        'images': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
        'videos': ['.mp4', '.webm', '.avi', '.mov', '.flv'],
        'audio': ['.mp3', '.ogg', '.wav', '.m4a', '.aac'],
        'documents': ['.pdf', '.epub', '.docx', '.doc', '.txt', '.xlsx'],
        'archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
        'ebooks': ['.mobi', '.azw', '.azw3', '.epub']
    }
    
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    def __init__(self, logger=None):
        self.logger = logger
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
        self.session.timeout = 10
        self.visited = set()
        
    def _log(self, msg: str, level: str = 'info'):
        """Log helper"""
        if self.logger:
            getattr(self.logger, level)(msg)
        else:
            print(f"[{level.upper()}] {msg}")
    
    def scrape_basic(self, url: str) -> List[Dict]:
        """Extract all media from a single page"""
        results = []
        try:
            response = self.session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'lxml')
            
            for media_type in self.MEDIA_EXTENSIONS:
                results.extend(self._extract_media(soup, url, media_type))
            
            self._log(f"Found {len(results)} media items from {url}")
            return results
        
        except Exception as e:
            self._log(f"Error scraping {url}: {str(e)}", 'error')
            return results
    
    def scrape_media(self, url: str, media_types: List[str]) -> List[Dict]:
        """Extract specific media types from a page"""
        results = []
        try:
            response = self.session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'lxml')
            
            for media_type in media_types:
                if media_type in self.MEDIA_EXTENSIONS:
                    results.extend(self._extract_media(soup, url, media_type))
            
            self._log(f"Found {len(results)} {', '.join(media_types)} from {url}")
            return results
        
        except Exception as e:
            self._log(f"Error scraping media from {url}: {str(e)}", 'error')
            return results
    
    def _extract_media(self, soup: BeautifulSoup, base_url: str, media_type: str) -> List[Dict]:
        """Extract media of specific type"""
        media_list = []
        extensions = self.MEDIA_EXTENSIONS.get(media_type, [])
        
        if media_type == 'images':
            # Extract from img tags, picture, and meta tags
            for tag in soup.find_all(['img']):
                src = tag.get('src') or tag.get('data-src')
                if src:
                    full_url = urljoin(base_url, src)
                    media_list.append(self._create_media_entry(full_url, 'images', base_url))
            
            # Picture tags
            for picture in soup.find_all('picture'):
                for source in picture.find_all('source'):
                    srcset = source.get('srcset')
                    if srcset:
                        url = srcset.split()[0]
                        full_url = urljoin(base_url, url)
                        media_list.append(self._create_media_entry(full_url, 'images', base_url))
            
            # OG images
            for meta in soup.find_all('meta', property='og:image'):
                content = meta.get('content')
                if content:
                    full_url = urljoin(base_url, content)
                    media_list.append(self._create_media_entry(full_url, 'images', base_url))
        
        elif media_type in ['videos', 'audio']:
            for tag in soup.find_all([media_type[:-1], 'source']):
                src = tag.get('src')
                if src:
                    full_url = urljoin(base_url, src)
                    media_list.append(self._create_media_entry(full_url, media_type, base_url))
        
        else:
            # For documents, archives, ebooks - look in links
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                if any(href.lower().endswith(ext) for ext in extensions):
                    full_url = urljoin(base_url, href)
                    media_list.append(self._create_media_entry(full_url, media_type, base_url))
        
        return media_list
    
    def _create_media_entry(self, url: str, media_type: str, source_url: str) -> Dict:
        """Create a structured media entry"""
        filename = os.path.basename(urlparse(url).path) or f"media_{hashlib.md5(url.encode()).hexdigest()[:8]}"
        
        return {
            'url': url,
            'type': media_type,
            'filename': filename,
            'source_page': source_url,
            'domain': urlparse(url).netloc,
            'id': hashlib.md5(url.encode()).hexdigest()
        }
    
    def deduplicate(self, media_list: List[Dict]) -> List[Dict]:
        """Remove duplicate media by URL"""
        seen = set()
        unique = []
        for item in media_list:
            if item['url'] not in seen:
                seen.add(item['url'])
                unique.append(item)
        return unique
