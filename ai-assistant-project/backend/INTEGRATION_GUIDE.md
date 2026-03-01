# AI Assistant - Integration Guide

## New Features Overview (Phase 2 Enhancement)

This guide documents the newly integrated web capabilities, image management, and auto-cleanup features added to the autonomous AI assistant.

---

## 1. Web Data Fetching

### What's New
The AI can now fetch and parse web content automatically when needed, without requiring external APIs or services.

### Components
- **WebFetcher** (`ai_engine/web_fetcher.py`): Handles HTTP requests and content parsing
- **ContextInspector** (`ai_engine/context_inspector.py`): Decides when web fetching is needed

### How It Works

**Automatic Detection:**
```python
# In ContextInspector.should_fetch_web()
# Auto-fetches for queries containing:
keywords = ["what", "how", "tell", "find", "current", "latest", "news", "today", "now"]
```

**Manual Override:**
```python
# Chat with forced web fetching
POST /api/chat
{
  "message": "What is Python?",
  "fetch_web": true  # Forces web fetch
}

# Chat without web fetching
POST /api/chat
{
  "message": "What is Python?",
  "fetch_web": false  # Disable web fetch
}
```

### Response Format
```python
result = agent.process_input("What is Python?")

# Returns Dict with:
{
  'response': 'String from AI',
  'web_data': {
    'url': 'https://...',
    'title': 'Page Title',
    'description': '...',
    'text_content': '...',
    'images': [{'url': '...', 'alt': '...'}],  # Max 10
    'links': [{'text': '...', 'href': '...'}],
    'status_code': 200
  },
  'images': [...],  # Stored image metadata
  'timestamp': '2024-12-19T10:30:00'
}
```

---

## 2. Image Management

### What's New
Images from web pages are automatically downloaded, stored, and managed with:
- **Limited storage**: Maximum 10 images at any time
- **Automatic deletion**: Auto-delete oldest when limit exceeded
- **Time-to-live (TTL)**: Auto-expire after 24 hours
- **Access tracking**: Track how often each image is accessed

### Components
- **ImageManager** (`ai_engine/image_manager.py`): Handles storage and cleanup

### Storage Structure
```
ai-assistant-project/backend/
├── storage/
│   └── images/
│       ├── abc123def456.jpg
│       ├── xyz789uvw012.png
│       └── ...
├── ai_assistant.db  # Contains images_stored table
```

### Database Schema
```sql
CREATE TABLE images_stored (
    id INTEGER PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    size_bytes INTEGER,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,  -- 24 hours from creation
    accessed_count INTEGER DEFAULT 0,
    last_accessed TEXT
);
```

### API Methods

**Store Image:**
```python
image_mgr = ImageManager()
result = image_mgr.store_image("https://example.com/image.jpg")

# Returns:
{
    'url': 'https://example.com/image.jpg',
    'filename': 'image.jpg',
    'path': 'storage/images/abc123.jpg',
    'size_bytes': 45678,
    'created_at': '2024-12-19T10:00:00',
    'expires_at': '2024-12-20T10:00:00'
}
```

**Get All Images:**
```python
images = image_mgr.get_all_images(limit=10)
# Returns list of up to 10 image metadata dicts
```

**Cleanup Expired:**
```python
count = image_mgr.cleanup_expired()
# Deletes images older than 24 hours
# Returns number of images deleted
```

### REST API
```bash
# List stored images
GET /api/images?limit=10

# Delete image
DELETE /api/images/1

# Manual cleanup
POST /api/images/cleanup
```

---

## 3. Context Management

### What's New
The AI now maintains contextual awareness by:
- Storing related information from web fetches
- Analyzing relevance of context for responses
- Building enhanced prompts with relevant context
- Managing context history (keeps last 20 items)

### Components
- **ContextInspector** (`ai_engine/context_inspector.py`): Manages context

### Context Types
```python
{
    'web': 'Information fetched from web pages',
    'memory': 'User-defined stored memories',
    'fact': 'Structured knowledge (subject-predicate-object)',
    'interaction': 'Previous conversation patterns',
    'web_decision': 'Metadata about web fetching decisions'
}
```

### API Methods

**Add Context:**
```python
inspector = ContextInspector()
inspector.add_context(
    type='web',
    source='https://en.wikipedia.org/wiki/Python',
    content='Python is a programming language...',
    relevance=0.92
)
```

**Get Relevant Context:**
```python
context = inspector.get_relevant_context(
    query='Python programming',
    types=['web', 'memory'],  # Filter by type
    limit=5
)

# Returns context sorted by relevance score
[
    {
        'id': 1,
        'type': 'web',
        'source': 'https://...',
        'content': '...',
        'relevance': 0.92,
        'created_at': '2024-12-19T10:00:00'
    },
    ...
]
```

**Auto Web Decision:**
```python
should_fetch = inspector.should_fetch_web("What is Python?")
# Returns True if keywords detected, False otherwise
```

### REST API
```bash
# Get context by query
GET /api/context?query=python&type=web

# Get all context
GET /api/context
```

---

## 4. Background Task Scheduler

### What's New
The AI now runs background tasks automatically using a daemon thread:
- **Auto-cleanup**: Images expire automatically every hour (configurable)
- **Extensible**: Easy to add more recurring tasks
- **Non-blocking**: Runs in background, doesn't block API responses
- **Graceful shutdown**: Stops cleanly on app shutdown

### Components
- **TaskScheduler** (`ai_engine/task_scheduler.py`): Manages background jobs

### How It Works

**Initialization** (in `app.py`):
```python
# Initialize scheduler
scheduler = TaskScheduler()

# Schedule recurring tasks
scheduler.schedule_recurring(
    'cleanup_images',
    agent.cleanup_images,
    3600  # Run every 3600 seconds (1 hour)
)

# Start daemon thread
scheduler.start()

# Graceful shutdown
scheduler.stop()
```

**Task Management:**
```python
# Schedule a new task
scheduler.schedule_recurring('my_task', my_function, interval_seconds=300)

# Get task status
status = scheduler.get_task_status('cleanup_images')
# Returns: {'enabled': True, 'interval': 3600, 'last_run': '...'}

# Disable task without stopping scheduler
scheduler.disable_task('cleanup_images')

# Re-enable task
scheduler.enable_task('cleanup_images')
```

### REST API
```bash
# Get scheduler status
GET /api/scheduler/status

# Response:
{
    "success": true,
    "scheduler": {
        "running": true,
        "tasks": {
            "cleanup_images": {
                "enabled": true,
                "interval": 3600,
                "last_run": "2024-12-19T10:00:00"
            }
        }
    }
}
```

---

## 5. Integration Points

### In Agent Class

**Initialization:**
```python
class AutonomousAgent:
    def __init__(self, enable_web=True):
        self.web_fetcher = WebFetcher() if enable_web else None
        self.image_manager = ImageManager() if enable_web else None
        self.context_inspector = ContextInspector() if enable_web else None
        self.task_scheduler = TaskScheduler() if enable_web else None
```

**Process Input Flow:**
```python
def process_input(user_input, fetch_web=None):
    # 1. Auto-detect if web fetch needed
    if fetch_web is None and self.context_inspector:
        fetch_web = self.context_inspector.should_fetch_web(user_input)
    
    # 2. Extract URL from input
    url = self._extract_url(user_input) if fetch_web else None
    
    # 3. Fetch web data
    web_data = self.web_fetcher.fetch_page(url) if url else None
    
    # 4. Store images (auto-limited to 10)
    images = []
    if web_data and self.image_manager:
        for img in web_data['images']:
            stored = self.image_manager.store_image(img['url'])
            images.append(stored)
    
    # 5. Add to context
    if web_data and self.context_inspector:
        self.context_inspector.add_context(
            type='web',
            source=web_data['url'],
            content=web_data['text_content'],
            relevance=self.context_inspector.analyze_web_data(web_data)
        )
    
    # 6. Generate response with context
    response = self.generate_response(user_input, web_data)
    
    # 7. Return complete result
    return {
        'response': response,
        'web_data': web_data,
        'images': images,
        'timestamp': datetime.now().isoformat()
    }
```

### In API Endpoints

**Updated /api/chat:**
```python
@api_bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message')
    fetch_web = data.get('fetch_web', None)  # Optional override
    
    # Process with new signature
    result = agent.process_input(user_input, fetch_web=fetch_web)
    
    # Return complete result with web data and images
    return jsonify({
        'success': True,
        'response': result['response'],
        'web_data': result.get('web_data'),
        'images': result.get('images'),
        'timestamp': result['timestamp']
    })
```

**New Web Endpoints:**
- `POST /api/fetch-web` - Manual web fetching
- `GET /api/images` - List stored images
- `DELETE /api/images/{id}` - Delete image
- `POST /api/images/cleanup` - Manual cleanup
- `GET /api/context` - Get context
- `GET /api/scheduler/status` - Scheduler status

### In Flask App

**Initialization** (in `app.py`):
```python
# Initialize agent with all components
agent = AutonomousAgent(enable_web=True)

# Start background scheduler
if agent.task_scheduler:
    agent.task_scheduler.schedule_recurring(
        'cleanup_images',
        agent.cleanup_images,
        3600  # Every hour
    )
    agent.task_scheduler.start()

# Graceful shutdown
@app.teardown_appcontext
def shutdown_scheduler(exception=None):
    if agent.task_scheduler:
        agent.task_scheduler.stop()
```

---

## 6. Configuration & Customization

### Environment Variables
```bash
# .env file
PORT=5000
DEBUG=False

# Web fetching
WEB_FETCH_TIMEOUT=10  # seconds
WEB_FETCH_MAX_SIZE=5242880  # 5MB in bytes

# Image management
IMAGE_MAX_COUNT=10  # Max images to store
IMAGE_TTL_HOURS=24  # Time to live in hours
IMAGE_STORAGE_PATH=storage/images/

# Task scheduler
CLEANUP_INTERVAL=3600  # seconds (1 hour)
```

### Python Configuration
```python
class AutonomousAgent:
    def __init__(self, enable_web=True, db_path='ai_assistant.db'):
        # Disable web features if needed
        self.web_fetcher = WebFetcher() if enable_web else None
        # ... other components

class ImageManager:
    def __init__(self, max_images=10, ttl_hours=24, storage_path='storage/images/'):
        self.max_images = max_images  # Limit enforcement
        self.ttl_hours = ttl_hours  # Auto-expiration timeout
        self.storage_path = storage_path  # Where to store files

class TaskScheduler:
    def schedule_recurring(self, task_id, func, interval_seconds):
        # Add custom tasks
        pass
```

---

## 7. Deployment Considerations

### cPanel Shared Hosting
- All features work on cPanel shared hosting (Python 3.7+)
- No external API keys or services required
- SQLite database for persistence
- Images stored in `storage/` subdirectory
- Background tasks run in daemon thread (not separate processes)

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run with debug enabled
export DEBUG=True
python app.py

# Test endpoints with provided examples
```

### Docker
```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

---

## 8. Testing New Features

### Test Script
```python
import requests
import json

BASE_URL = "http://localhost:5000/api"

# Test 1: Manual web fetch
print("Test 1: Web Fetch")
response = requests.post(
    f"{BASE_URL}/fetch-web",
    json={"url": "https://en.wikipedia.org/wiki/Python_(programming_language)"}
)
print(json.dumps(response.json(), indent=2))

# Test 2: Chat with auto-fetch
print("\nTest 2: Chat with Auto Web Fetch")
response = requests.post(
    f"{BASE_URL}/chat",
    json={"message": "What is machine learning?"}
)
print(json.dumps(response.json(), indent=2))

# Test 3: List images
print("\nTest 3: List Stored Images")
response = requests.get(f"{BASE_URL}/images")
print(json.dumps(response.json(), indent=2))

# Test 4: Get context
print("\nTest 4: Context")
response = requests.get(f"{BASE_URL}/context?query=Python")
print(json.dumps(response.json(), indent=2))

# Test 5: Scheduler status
print("\nTest 5: Scheduler Status")
response = requests.get(f"{BASE_URL}/scheduler/status")
print(json.dumps(response.json(), indent=2))
```

---

## 9. Troubleshooting

### Images Not Storing
- Check `storage/images/` directory exists
- Verify disk space available
- Check file permissions: `chmod 755 storage/images/`

### Web Fetch Timing Out
- Increase timeout in config: `WEB_FETCH_TIMEOUT=20`
- Check network connectivity
- Verify target URLs are accessible

### Scheduler Not Running
- Check logs: `tail -f app.log`
- Verify `TaskScheduler` initialized: `GET /api/scheduler/status`
- Ensure `daemon_thread` is alive: Check Flask app startup logs

### Memory Usage High
- Reduce image limit: `IMAGE_MAX_COUNT=5`
- Reduce context history: Modify `ContextInspector.max_contexts`
- Clear old images: `POST /api/images/cleanup`

---

## 10. Performance Metrics

### Expected Performance
- Auto-web detection: <50ms (keyword matching)
- Web page fetch: 1-5 seconds (depends on page size)
- Image storing: <200ms per image
- Context retrieval: <20ms
- API response time: 100-500ms typical

### Optimization Tips
- Cache frequently accessed web pages
- Reduce web fetch concurrency (one at a time)
- Monitor image storage usage
- Review context relevance scoring

---

## 11. Security Considerations

### Web Fetching
- Validates URLs before fetching (prevents SSRF)
- Limits content size (5MB) to prevent memory exhaustion
- Timeout protection (10 seconds) against hanging requests
- No JavaScript execution (static parsing only)

### Image Storage
- Stores in isolated directory with hash-based filenames
- No direct file access via web paths
- Auto-cleanup prevents storage exhaustion

### Database
- SQLite with local file storage (no external exposure)
- Parameterized queries prevent SQL injection
- Proper transaction handling

---

## Next Steps

1. **Deploy to cPanel**: Use provided deployment guide
2. **Build Frontend**: React frontend for web/local dev
3. **Android APK**: Package as mobile application
4. **Advanced NLP**: Add sentiment analysis and entity linking
5. **Webhooks**: Add notification system

