"""Web data fetching module for AI context"""

import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse
import json
import logging

logger = logging.getLogger(__name__)


class WebFetcher:
    """Fetch and process web data for AI context"""
    
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    def __init__(self, timeout: int = 10, max_content_size: int = 5 * 1024 * 1024):
        """Initialize web fetcher
        
        Args:
            timeout: Request timeout in seconds
            max_content_size: Maximum content size in bytes (5MB default)
        """
        self.timeout = timeout
        self.max_content_size = max_content_size
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
    
    def fetch_page(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch and parse a web page
        
        Args:
            url: URL to fetch
            
        Returns:
            Dict with title, content, images, links, or None if failed
        """
        try:
            # Validate URL
            if not self._is_valid_url(url):
                logger.warning(f"Invalid URL: {url}")
                return None
            
            # Fetch page
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            # Check content size
            if len(response.content) > self.max_content_size:
                logger.warning(f"Content too large: {len(response.content)} bytes")
                return None
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'lxml')
            
            return {
                'url': url,
                'title': soup.title.string if soup.title else 'No title',
                'description': self._extract_meta_description(soup),
                'text_content': self._extract_text(soup),
                'images': self._extract_images(soup, url, limit=10),
                'links': self._extract_links(soup, url, limit=20),
                'metadata': self._extract_metadata(soup),
                'status_code': response.status_code
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error for {url}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Parse error for {url}: {str(e)}")
            return None
    
    def fetch_json(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch JSON from API endpoint
        
        Args:
            url: API endpoint URL
            
        Returns:
            Parsed JSON or None if failed
        """
        try:
            if not self._is_valid_url(url):
                return None
            
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            return {
                'url': url,
                'data': response.json(),
                'status_code': response.status_code
            }
        
        except Exception as e:
            logger.error(f"JSON fetch error for {url}: {str(e)}")
            return None
    
    def search_content(self, url: str, keywords: List[str]) -> Optional[Dict[str, Any]]:
        """Fetch page and search for keywords in content
        
        Args:
            url: URL to fetch
            keywords: Keywords to search for
            
        Returns:
            Page data with relevant sections
        """
        page_data = self.fetch_page(url)
        if not page_data:
            return None
        
        # Find keyword matches in text
        text = page_data['text_content'].lower()
        matches = []
        
        for keyword in keywords:
            if keyword.lower() in text:
                # Find context around keyword
                idx = text.find(keyword.lower())
                start = max(0, idx - 100)
                end = min(len(text), idx + len(keyword) + 100)
                context = page_data['text_content'][start:end]
                matches.append({
                    'keyword': keyword,
                    'context': context.strip(),
                    'position': idx
                })
        
        page_data['keyword_matches'] = matches
        return page_data
    
    def scrape_table_data(self, url: str) -> Optional[List[Dict[str, str]]]:
        """Extract table data from page
        
        Args:
            url: URL to scrape
            
        Returns:
            List of rows as dictionaries
        """
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'lxml')
            
            tables = []
            for table in soup.find_all('table'):
                rows = []
                headers = []
                
                # Get headers
                for th in table.find_all('th'):
                    headers.append(th.get_text(strip=True))
                
                # If no headers, skip table
                if not headers:
                    headers = [f"col_{i}" for i in range(10)]
                
                # Get rows
                for tr in table.find_all('tr')[1:]:  # Skip header row
                    cells = []
                    for td in tr.find_all('td'):
                        cells.append(td.get_text(strip=True))
                    
                    if cells:
                        row = dict(zip(headers, cells))
                        rows.append(row)
                
                if rows:
                    tables.append(rows)
            
            return tables if tables else None
        
        except Exception as e:
            logger.error(f"Table scrape error: {str(e)}")
            return None
    
    @staticmethod
    def _is_valid_url(url: str) -> bool:
        """Validate URL format"""
        try:
            result = urlparse(url)
            return all([result.scheme in ['http', 'https'], result.netloc])
        except:
            return False
    
    @staticmethod
    def _extract_text(soup: BeautifulSoup, limit: int = 1000) -> str:
        """Extract main text content"""
        # Remove script and style elements
        for script in soup(['script', 'style', 'nav', 'footer']):
            script.decompose()
        
        # Get text
        text = soup.get_text(separator=' ', strip=True)
        
        # Limit length
        return text[:limit]
    
    @staticmethod
    def _extract_meta_description(soup: BeautifulSoup) -> str:
        """Extract meta description"""
        meta = soup.find('meta', attrs={'name': 'description'})
        return meta.get('content', '') if meta else ''
    
    @staticmethod
    def _extract_images(soup: BeautifulSoup, base_url: str, limit: int = 10) -> List[Dict[str, str]]:
        """Extract images with limit"""
        images = []
        
        for img in soup.find_all('img')[:limit]:
            src = img.get('src', '')
            if src:
                full_url = urljoin(base_url, src)
                images.append({
                    'url': full_url,
                    'alt': img.get('alt', ''),
                    'title': img.get('title', '')
                })
        
        return images
    
    @staticmethod
    def _extract_links(soup: BeautifulSoup, base_url: str, limit: int = 20) -> List[Dict[str, str]]:
        """Extract links"""
        links = []
        
        for link in soup.find_all('a', href=True)[:limit]:
            href = link.get('href', '')
            if href:
                full_url = urljoin(base_url, href)
                links.append({
                    'url': full_url,
                    'text': link.get_text(strip=True)
                })
        
        return links
    
    @staticmethod
    def _extract_metadata(soup: BeautifulSoup) -> Dict[str, str]:
        """Extract page metadata"""
        metadata = {}
        
        for meta in soup.find_all('meta'):
            name = meta.get('name', '') or meta.get('property', '')
            content = meta.get('content', '')
            if name and content:
                metadata[name] = content
        
        return metadata
