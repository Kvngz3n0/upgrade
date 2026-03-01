"""Main Flask application for AI Assistant"""

import os
import logging
from flask import Flask, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# Import AI modules
from ai_engine.agent import AutonomousAgent
from ai_engine.memory import Memory
from ai_engine.learning import LearningSystem
from api.endpoints import api_bp, init_api

# Configuration
load_dotenv()
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize AI components
agent = AutonomousAgent()
memory = Memory()
learning = LearningSystem()

# Initialize API with components
init_api(agent, memory, learning)

# Start background scheduler for image cleanup
if agent.task_scheduler:
    logger.info("Starting task scheduler...")
    agent.task_scheduler.schedule_recurring(
        'cleanup_images',
        agent.cleanup_images,
        3600  # Run every hour
    )
    agent.task_scheduler.start()
    logger.info("Task scheduler started with image cleanup task")


@app.before_request
def before_request():
    """Pre-request setup"""
    pass


@app.teardown_appcontext
def shutdown_scheduler(exception=None):
    """Gracefully shutdown scheduler"""
    if agent and agent.task_scheduler:
        logger.info("Stopping task scheduler...")
        agent.task_scheduler.stop()


# Routes
app.register_blueprint(api_bp)


@app.route('/')
def index():
    """Serve main frontend"""
    try:
        return render_template('index.html')
    except:
        return '''
        <html>
        <head>
            <title>AI Assistant API</title>
            <style>
                body { font-family: Arial; margin: 40px; }
                .endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>🤖 Autonomous AI Assistant</h1>
            <p>API Server Running</p>
            
            <h2>Endpoints:</h2>
            <div class="endpoint">
                <strong>POST /api/chat</strong> - Send message to AI
                <pre>{"message": "Hello!"}</pre>
            </div>
            <div class="endpoint">
                <strong>GET /api/chat/history</strong> - Get conversation history
            </div>
            <div class="endpoint">
                <strong>GET /api/learning/progress</strong> - Get learning stats
            </div>
            <div class="endpoint">
                <strong>GET /api/health</strong> - Health check
            </div>
            
            <p><a href="/api/learning/export">Export Learning</a></p>
        </body>
        </html>
        '''


@app.errorhandler(404)
def not_found(e):
    return {'error': 'Not found'}, 404


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}")
    return {'error': 'Internal server error'}, 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting AI Assistant on port {port}")
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
