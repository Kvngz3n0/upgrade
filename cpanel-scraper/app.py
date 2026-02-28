#!/usr/bin/env python3
"""
cPanel-Optimized Web Scraper with Gallery Format Display
Efficient, lightweight, and error-resistant for shared hosting
"""

import os
import json
import csv
import threading
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from queue import Queue
from dotenv import load_dotenv

# Import modules
from scrapers.media_scraper import MediaScraper
from scrapers.web_crawler import WebCrawler
from scrapers.social_lookup import SocialMediaLookup
from scrapers.gallery_renderer import GalleryRenderer
from utils.error_handler import ErrorHandler
from utils.logger import setup_logger

# Configuration
load_dotenv()
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload
app.config['UPLOAD_FOLDER'] = 'temp_uploads'
app.config['RESULTS_FOLDER'] = 'scrape_results'

# Setup logging
logger = setup_logger()
error_handler = ErrorHandler(logger)

# Create directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

# Global state
scraper_state = {
    'is_running': False,
    'progress': 0,
    'status': 'idle',
    'errors': [],
    'results': None
}

download_queue = Queue()
lock = threading.Lock()


@app.route('/')
def index():
    """Render main interface"""
    return render_template('index.html')


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'scraper_running': scraper_state['is_running']
    })


@app.route('/api/scrape/basic', methods=['POST'])
@error_handler.handle_errors
def scrape_basic():
    """Basic web scraping with gallery display"""
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL required'}), 400
    
    try:
        scraper = MediaScraper(logger)
        results = scraper.scrape_basic(url)
        
        gallery = GalleryRenderer.create_gallery(results, 'all')
        
        return jsonify({
            'success': True,
            'data': results,
            'gallery_html': gallery
        })
    except Exception as e:
        logger.error(f"Basic scrape error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/scrape/media', methods=['POST'])
@error_handler.handle_errors
def scrape_media():
    """Media-specific scraping with gallery display"""
    data = request.json
    url = data.get('url')
    media_types = data.get('media_types', ['images'])
    
    if not url:
        return jsonify({'error': 'URL required'}), 400
    
    def run_scrape():
        with lock:
            scraper_state['is_running'] = True
            scraper_state['status'] = 'scraping'
            scraper_state['progress'] = 0
    
    try:
        run_scrape()
        
        scraper = MediaScraper(logger)
        results = scraper.scrape_media(url, media_types)
        
        gallery = GalleryRenderer.create_gallery(results, media_types)
        
        with lock:
            scraper_state['is_running'] = False
            scraper_state['status'] = 'completed'
            scraper_state['progress'] = 100
            scraper_state['results'] = results
        
        return jsonify({
            'success': True,
            'data': results,
            'gallery_html': gallery,
            'count': len(results)
        })
    except Exception as e:
        logger.error(f"Media scrape error: {str(e)}")
        with lock:
            scraper_state['is_running'] = False
            scraper_state['errors'].append(str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/api/crawl', methods=['POST'])
@error_handler.handle_errors
def crawl_website():
    """Website crawling with gallery display"""
    data = request.json
    url = data.get('url')
    max_depth = data.get('max_depth', 2)
    max_pages = data.get('max_pages', 50)
    media_types = data.get('media_types', ['images'])
    
    if not url:
        return jsonify({'error': 'URL required'}), 400
    
    try:
        crawler = WebCrawler(logger)
        results = crawler.crawl(url, max_depth, max_pages, media_types)
        
        gallery = GalleryRenderer.create_gallery(results, media_types)
        
        return jsonify({
            'success': True,
            'data': results,
            'gallery_html': gallery,
            'pages_crawled': len(results.get('pages', [])),
            'total_media': len(results.get('media', []))
        })
    except Exception as e:
        logger.error(f"Crawl error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/social', methods=['POST'])
@error_handler.handle_errors
def lookup_social():
    """Social media lookup with results display"""
    data = request.json
    username = data.get('username')
    platform = data.get('platform')
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    try:
        lookup = SocialMediaLookup(logger)
        result = lookup.find_profiles(username, platform)
        
        return jsonify({
            'success': True,
            'data': result,
            'profiles_found': len(result.get('profiles', []))
        })
    except Exception as e:
        logger.error(f"Social lookup error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/download-results', methods=['POST'])
@error_handler.handle_errors
def download_results():
    """Download results as JSON or CSV"""
    data = request.json
    format_type = data.get('format', 'json')
    
    if not scraper_state['results']:
        return jsonify({'error': 'No results to download'}), 400
    
    try:
        filename = f"scrape_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if format_type == 'json':
            filepath = os.path.join(app.config['RESULTS_FOLDER'], f"{filename}.json")
            with open(filepath, 'w') as f:
                json.dump(scraper_state['results'], f, indent=2)
        else:
            filepath = os.path.join(app.config['RESULTS_FOLDER'], f"{filename}.csv")
            with open(filepath, 'w', newline='') as f:
                writer = csv.writer(f)
                # Write header and data based on results structure
                if isinstance(scraper_state['results'], list):
                    if scraper_state['results']:
                        writer.writerow(scraper_state['results'][0].keys())
                        for item in scraper_state['results']:
                            writer.writerow(item.values())
        
        return send_file(filepath, as_attachment=True)
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current scraper status"""
    with lock:
        return jsonify({
            'is_running': scraper_state['is_running'],
            'progress': scraper_state['progress'],
            'status': scraper_state['status'],
            'errors': scraper_state['errors'][-10:]  # Last 10 errors
        })


@app.route('/api/cancel', methods=['POST'])
def cancel_scrape():
    """Cancel current scraping operation"""
    with lock:
        scraper_state['is_running'] = False
        scraper_state['status'] = 'cancelled'
        return jsonify({'success': True, 'message': 'Scraping cancelled'})


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # For cPanel: use gunicorn in production
    # Development: flask run
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
