"""Social media lookup module"""

import requests
from typing import List, Dict, Optional
from urllib.parse import quote

class SocialMediaLookup:
    """Find social media profiles by username"""
    
    PLATFORMS = {
        'twitter': {'url': 'https://twitter.com/{username}', 'name': 'Twitter/X'},
        'instagram': {'url': 'https://instagram.com/{username}', 'name': 'Instagram'},
        'github': {'url': 'https://github.com/{username}', 'name': 'GitHub'},
        'linkedin': {'url': 'https://linkedin.com/in/{username}', 'name': 'LinkedIn'},
        'tiktok': {'url': 'https://tiktok.com/@{username}', 'name': 'TikTok'},
        'youtube': {'url': 'https://youtube.com/@{username}', 'name': 'YouTube'},
        'facebook': {'url': 'https://facebook.com/{username}', 'name': 'Facebook'},
        'reddit': {'url': 'https://reddit.com/user/{username}', 'name': 'Reddit'},
        'twitch': {'url': 'https://twitch.tv/{username}', 'name': 'Twitch'},
        'pinterest': {'url': 'https://pinterest.com/{username}', 'name': 'Pinterest'},
    }
    
    def __init__(self, logger=None):
        self.logger = logger
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.session.timeout = 5
    
    def _log(self, msg: str, level: str = 'info'):
        """Log helper"""
        if self.logger:
            getattr(self.logger, level)(msg)
        else:
            print(f"[{level.upper()}] {msg}")
    
    def find_profiles(self, username: str, platform: Optional[str] = None) -> Dict:
        """Find user profiles across platforms"""
        results = {
            'username': username,
            'profiles': [],
            'total_found': 0
        }
        
        platforms_to_check = [platform] if platform else self.PLATFORMS.keys()
        
        for plat in platforms_to_check:
            if plat not in self.PLATFORMS:
                continue
            
            try:
                url = self.PLATFORMS[plat]['url'].format(username=quote(username))
                profile = self._check_profile(plat, url)
                if profile:
                    results['profiles'].append(profile)
            except Exception as e:
                self._log(f"Error checking {plat}: {str(e)}", 'warning')
        
        results['total_found'] = len(results['profiles'])
        return results
    
    def _check_profile(self, platform: str, url: str) -> Optional[Dict]:
        """Check if profile exists"""
        try:
            response = self.session.head(url, allow_redirects=True, timeout=5)
            if response.status_code == 200:
                return {
                    'platform': platform,
                    'name': self.PLATFORMS[platform]['name'],
                    'url': url,
                    'status': 'active'
                }
        except:
            pass
        
        return None
    
    def get_available_platforms(self) -> List[str]:
        """Get list of available platforms"""
        return list(self.PLATFORMS.keys())
