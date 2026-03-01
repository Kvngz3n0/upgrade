"""Gallery renderer module - creates gallery format display"""

from typing import List, Dict, Optional
import json

class GalleryRenderer:
    """Generate gallery format display for scraping results"""
    
    @staticmethod
    def create_gallery(items: List[Dict], media_types: List[str] = None) -> str:
        """Create HTML gallery from media items"""
        if not items:
            return "<div class='gallery empty'><p>No results found</p></div>"
        
        if isinstance(media_types, str):
            media_types = [media_types]
        
        gallery_html = '<div class="gallery container">'
        
        # Group by type
        grouped = {}
        for item in items:
            item_type = item.get('type', 'unknown')
            if item_type not in grouped:
                grouped[item_type] = []
            grouped[item_type].append(item)
        
        # Create gallery sections
        for media_type, media_items in grouped.items():
            gallery_html += GalleryRenderer._create_section(media_type, media_items)
        
        gallery_html += '</div>'
        return gallery_html
    
    @staticmethod
    def _create_section(media_type: str, items: List[Dict]) -> str:
        """Create gallery section for media type"""
        section = f'<section class="gallery-section" data-type="{media_type}">'
        section += f'<h2>{media_type.capitalize()} ({len(items)})</h2>'
        section += '<div class="gallery-grid">'
        
        for item in items:
            section += GalleryRenderer._create_item(item, media_type)
        
        section += '</div></section>'
        return section
    
    @staticmethod
    def _create_item(item: Dict, media_type: str) -> str:
        """Create gallery item HTML"""
        url = item.get('url', '')
        filename = item.get('filename', 'File')
        source_page = item.get('source_page', '')
        
        item_html = '<div class="gallery-item" data-url="' + url + '">'
        
        if media_type == 'images':
            item_html += f'<div class="gallery-preview">'
            item_html += f'<img src="{url}" alt="{filename}" loading="lazy" onerror="this.src=\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\'">'
            item_html += '</div>'
        elif media_type == 'videos':
            item_html += f'<div class="gallery-preview video-thumb">'
            item_html += f'<video controls muted><source src="{url}"></video>'
            item_html += '</div>'
        elif media_type == 'audio':
            item_html += f'<div class="gallery-preview audio-thumb">'
            item_html += f'<audio controls><source src="{url}"></audio>'
            item_html += '</div>'
        else:
            item_html += f'<div class="gallery-preview doc-thumb">'
            item_html += f'<div class="file-icon">📄</div>'
            item_html += '</div>'
        
        item_html += f'<div class="gallery-info">'
        item_html += f'<div class="filename">{filename}</div>'
        item_html += f'<div class="actions">'
        item_html += f'<a href="{url}" target="_blank" class="btn-open">Open</a>'
        item_html += f'<a href="{url}" download class="btn-download">Download</a>'
        item_html += f'</div>'
        item_html += f'</div>'
        item_html += '</div>'
        
        return item_html
    
    @staticmethod
    def get_gallery_css() -> str:
        """Get CSS for gallery display"""
        return """
        <style>
        .gallery.container {
            width: 100%;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .gallery-section {
            margin-bottom: 40px;
        }
        
        .gallery-section h2 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
        }
        
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            width: 100%;
        }
        
        .gallery-item {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
            display: flex;
            flex-direction: column;
        }
        
        .gallery-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        
        .gallery-preview {
            width: 100%;
            height: 200px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .gallery-preview img,
        .gallery-preview video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .gallery-preview audio {
            width: 100%;
            padding: 10px;
        }
        
        .gallery-preview .file-icon {
            font-size: 48px;
        }
        
        .gallery-info {
            padding: 15px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        
        .filename {
            font-size: 14px;
            color: #666;
            word-break: break-all;
            margin-bottom: 10px;
            flex-grow: 1;
        }
        
        .actions {
            display: flex;
            gap: 8px;
        }
        
        .btn-open, .btn-download {
            flex: 1;
            padding: 8px 12px;
            text-align: center;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .btn-open {
            background: #007bff;
            color: white;
        }
        
        .btn-open:hover {
            background: #0056b3;
        }
        
        .btn-download {
            background: #28a745;
            color: white;
        }
        
        .btn-download:hover {
            background: #1e7e34;
        }
        
        .gallery.empty {
            text-align: center;
            padding: 40px 20px;
            color: #999;
        }
        
        @media (max-width: 768px) {
            .gallery-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
        }
        </style>
        """
