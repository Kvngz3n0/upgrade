"""Web crawler module - optimized for cPanel"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Optional
from .media_scraper import MediaScraper

class WebCrawler:
    """Crawl websites and extract media from multiple pages"""
    
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    def __init__(self, logger=None):
        self.logger = logger
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
        self.session.timeout = 10
        self.visited_urls = set()
        self.media_scraper = MediaScraper(logger)
    
    def _log(self, msg: str, level: str = 'info'):
        """Log helper"""
        if self.logger:
            getattr(self.logger, level)(msg)
        else:
            print(f"[{level.upper()}] {msg}")
    
    def crawl(self, start_url: str, max_depth: int = 2, max_pages: int = 50, 
              media_types: List[str] = None) -> Dict:
        """Crawl website and extract media"""
        if media_types is None:
            media_types = ['images']
        
        results = {
            'start_url': start_url,
            'pages': [],
            'media': [],
            'errors': [],
            'total_pages': 0
        }
        
        try:
            self._crawl_recursive(start_url, 0, max_depth, max_pages, media_types, results)
        except Exception as e:
            self._log(f"Crawl error: {str(e)}", 'error')
            results['errors'].append(str(e))
        
        results['total_pages'] = len(results['pages'])
        return results
    
    def _crawl_recursive(self, url: str, current_depth: int, max_depth: int, 
                        max_pages: int, media_types: List[str], results: Dict):
        """Recursively crawl pages"""
        # Check limits
        if url in self.visited_urls or len(self.visited_urls) >= max_pages or current_depth > max_depth:
            return
        
        try:
            self._log(f"Crawling [{current_depth}]: {url}")
            self.visited_urls.add(url)
            
            response = self.session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Extract media
            media = self.media_scraper._extract_media(soup, url, 'images') if 'images' in media_types else []
            results['media'].extend(media)
            
            # Add page to results
            results['pages'].append({
                'url': url,
                'title': soup.title.string if soup.title else 'No title',
                'media_count': len(media),
                'depth': current_depth
            })
            
            # Find and crawl links
            base_domain = urlparse(url).netloc
            for link_tag in soup.find_all('a', href=True):
                link = link_tag.get('href')
                if not link:
                    continue
                
                full_url = urljoin(url, link)
                
                # Only crawl same domain
                if urlparse(full_url).netloc == base_domain:
                    if full_url not in self.visited_urls and len(self.visited_urls) < max_pages:
                        self._crawl_recursive(full_url, current_depth + 1, max_depth, 
                                            max_pages, media_types, results)
        
        except requests.exceptions.RequestException as e:
            self._log(f"Request error for {url}: {str(e)}", 'warning')
            results['errors'].append(f"{url}: {str(e)}")
        except Exception as e:
            self._log(f"Error crawling {url}: {str(e)}", 'error')
            results['errors'].append(f"{url}: {str(e)}")
