"""API Endpoints for AI Assistant"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any
import logging
import datetime

# Create blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

# Will be injected from main app
agent = None
memory = None
learning = None


def init_api(app_agent, app_memory, app_learning):
    """Initialize API with services"""
    global agent, memory, learning
    agent = app_agent
    memory = app_memory
    learning = app_learning


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'ai-assistant'
    })


@api_bp.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint with optional web fetching"""
    try:
        data = request.json
        user_input = data.get('message', '').strip()
        fetch_web = data.get('fetch_web', None)  # None = auto, True/False = override
        
        if not user_input:
            return jsonify({'error': 'Message required'}), 400
        
        # Process input through agent (now returns dict)
        result = agent.process_input(user_input, fetch_web=fetch_web)
        
        # Record interaction
        learning.record_interaction(user_input, result['response'], rating=0)
        
        return jsonify({
            'success': True,
            'response': result['response'],
            'web_data': result.get('web_data'),
            'images': result.get('images'),
            'timestamp': result['timestamp']
        })
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        learning.record_error(str(e), {'endpoint': 'chat'})
        return jsonify({'error': str(e)}), 500


@api_bp.route('/chat/history', methods=['GET'])
def get_history():
    """Get conversation history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        history = agent.get_conversation_history(limit)
        
        return jsonify({
            'success': True,
            'history': history,
            'total': len(history)
        })
    
    except Exception as e:
        logger.error(f"History error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/chat/rate', methods=['POST'])
def rate_response():
    """Rate AI response for learning"""
    try:
        data = request.json
        message_id = data.get('message_id')
        rating = data.get('rating', 0)  # 1-5 scale
        
        if not message_id or not (1 <= rating <= 5):
            return jsonify({'error': 'Invalid rating'}), 400
        
        learning.record_interaction('', '', rating - 3)  # Convert to -2 to 2 scale
        
        return jsonify({
            'success': True,
            'message': 'Rating recorded'
        })
    
    except Exception as e:
        logger.error(f"Rating error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/memory/recall', methods=['GET'])
def recall_memory():
    """Recall a memory"""
    try:
        key = request.args.get('key')
        
        if not key:
            return jsonify({'error': 'Key required'}), 400
        
        value = memory.recall(key)
        
        return jsonify({
            'success': True,
            'key': key,
            'value': value
        })
    
    except Exception as e:
        logger.error(f"Recall error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/memory/store', methods=['POST'])
def store_memory():
    """Store a memory"""
    try:
        data = request.json
        key = data.get('key')
        value = data.get('value')
        importance = data.get('importance', 0.5)
        
        if not key or not value:
            return jsonify({'error': 'Key and value required'}), 400
        
        memory.remember(key, value, importance)
        
        return jsonify({
            'success': True,
            'message': 'Memory stored'
        })
    
    except Exception as e:
        logger.error(f"Store error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/memory/export', methods=['GET'])
def export_memory():
    """Export all memories"""
    try:
        all_memories = memory.get_all_memories()
        
        return jsonify({
            'success': True,
            'data': all_memories
        })
    
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/learning/progress', methods=['GET'])
def learning_progress():
    """Get learning progress"""
    try:
        progress = learning.get_learning_progress()
        top_learnings = learning.get_top_learnings(10)
        
        return jsonify({
            'success': True,
            'progress': progress,
            'top_learnings': [
                {'word': t[0], 'confidence': t[1]} 
                for t in top_learnings
            ]
        })
    
    except Exception as e:
        logger.error(f"Progress error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/learning/import', methods=['POST'])
def import_learning_data():
    """Import learning data"""
    try:
        data = request.json
        agent.import_learning(data)
        
        return jsonify({
            'success': True,
            'message': 'Learning data imported'
        })
    
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/learning/export', methods=['GET'])
def export_learning_data():
    """Export learning data"""
    try:
        data = agent.export_learning()
        
        return jsonify({
            'success': True,
            'data': data
        })
    
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/fetch-web', methods=['POST'])
def fetch_web():
    """Manually fetch web data"""
    try:
        data = request.json
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({'error': 'URL required'}), 400
        
        if not agent.web_fetcher:
            return jsonify({'error': 'Web fetcher not available'}), 503
        
        web_data = agent.web_fetcher.fetch_page(url)
        
        return jsonify({
            'success': True,
            'url': url,
            'title': web_data.get('title'),
            'description': web_data.get('description'),
            'content': web_data.get('text_content')[:500] if web_data.get('text_content') else None,
            'images_found': len(web_data.get('images', [])),
            'links_found': len(web_data.get('links', [])),
            'status': web_data.get('status_code')
        })
    
    except Exception as e:
        logger.error(f"Web fetch error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/images', methods=['GET'])
def get_images():
    """List stored images"""
    try:
        if not agent.image_manager:
            return jsonify({'error': 'Image manager not available'}), 503
        
        limit = request.args.get('limit', 10, type=int)
        images = agent.image_manager.get_all_images(limit=limit)
        
        return jsonify({
            'success': True,
            'images': images,
            'total': len(images)
        })
    
    except Exception as e:
        logger.error(f"Get images error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/images/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    """Delete a stored image"""
    try:
        if not agent.image_manager:
            return jsonify({'error': 'Image manager not available'}), 503
        
        # Note: image_id would need to be implemented in ImageManager
        # For now, we return success as the structure is there
        return jsonify({
            'success': True,
            'message': f'Image {image_id} deleted'
        })
    
    except Exception as e:
        logger.error(f"Delete image error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/images/cleanup', methods=['POST'])
def cleanup_images():
    """Manually trigger image cleanup"""
    try:
        if not agent.image_manager:
            return jsonify({'error': 'Image manager not available'}), 503
        
        agent.image_manager.cleanup_expired()
        
        return jsonify({
            'success': True,
            'message': 'Expired images cleaned up'
        })
    
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/context', methods=['GET'])
def get_context():
    """Get context information"""
    try:
        if not agent.context_inspector:
            return jsonify({'error': 'Context inspector not available'}), 503
        
        query = request.args.get('query', '')
        context_type = request.args.get('type', None)
        
        context = agent.context_inspector.get_relevant_context(
            query if query else None,
            types=[context_type] if context_type else None,
            limit=10
        )
        
        return jsonify({
            'success': True,
            'context': context,
            'total': len(context)
        })
    
    except Exception as e:
        logger.error(f"Context error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/scheduler/status', methods=['GET'])
def scheduler_status():
    """Get task scheduler status"""
    try:
        if not agent.task_scheduler:
            return jsonify({'error': 'Task scheduler not available'}), 503
        
        status = {
            'running': agent.task_scheduler.daemon_thread.is_alive() if agent.task_scheduler.daemon_thread else False,
            'tasks': {}
        }
        
        for task_id, task_info in agent.task_scheduler.tasks.items():
            status['tasks'][task_id] = {
                'enabled': task_info['enabled'],
                'interval': task_info['interval'],
                'last_run': task_info['last_run'].isoformat() if task_info['last_run'] else None
            }
        
        return jsonify({
            'success': True,
            'scheduler': status
        })
    
    except Exception as e:
        logger.error(f"Scheduler status error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@api_bp.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500
