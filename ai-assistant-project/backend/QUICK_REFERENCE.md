# AI Assistant - Quick Reference Guide

## Quick Start

### Run the Server
```bash
cd ai-assistant-project/backend
pip install -r requirements.txt
python app.py
```

The API will be available at `http://localhost:5000/api`

---

## Essential Endpoints

### Chat with AI
```bash
# Auto-detect web fetch
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Python?"}'

# Force web fetch
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Latest news about AI", "fetch_web": true}'

# No web fetch
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "fetch_web": false}'
```

### Get Conversation History
```bash
curl http://localhost:5000/api/chat/history?limit=10
```

### List Images
```bash
# Get all images (max 10)
curl http://localhost:5000/api/images

# Get specific number
curl http://localhost:5000/api/images?limit=5
```

### Cleanup Images
```bash
# Manual cleanup (also runs hourly automatically)
curl -X POST http://localhost:5000/api/images/cleanup
```

### Check Scheduler Status
```bash
curl http://localhost:5000/api/scheduler/status
```

### Get Context
```bash
# By query
curl http://localhost:5000/api/context?query=Python

# By type
curl http://localhost:5000/api/context?type=web
```

---

## File Structure
```
ai-assistant-project/
├── backend/
│   ├── app.py                      # Flask app entry point
│   ├── requirements.txt            # Python dependencies
│   ├── ai_assistant.db             # SQLite database
│   ├── INTEGRATION_GUIDE.md        # Detailed integration docs
│   ├── API_DOCUMENTATION.md        # Complete API reference
│   ├── storage/
│   │   └── images/                 # Stored images (auto-cleanup)
│   ├── ai_engine/
│   │   ├── agent.py                # Main AI agent
│   │   ├── web_fetcher.py          # Web page parsing (NEW)
│   │   ├── image_manager.py        # Image storage (NEW)
│   │   ├── context_inspector.py    # Context management (NEW)
│   │   ├── task_scheduler.py       # Background jobs (NEW)
│   │   ├── memory.py               # Memory system
│   │   ├── learning.py             # Learning system
│   │   ├── nlp.py                  # NLP utilities
│   │   └── __init__.py             # Module exports
│   └── api/
│       ├── endpoints.py            # API routes
│       └── __init__.py
```

---

## Features At A Glance

| Feature | Purpose | Auto | Config |
|---------|---------|------|--------|
| **Web Fetching** | Fetch page content automatically | Yes | `fetch_web` param |
| **Image Storage** | Store images from web | Yes | Max 10, TTL 24hr |
| **Context Memory** | Remember context for answers | Yes | Auto-managed |
| **Image Cleanup** | Auto-delete old images | Yes | Hourly (3600s) |
| **Learning** | Learn from interactions | Yes | Auto-records |
| **Task Scheduler** | Run background jobs | Yes | Daemon thread |

---

## Environment Setup

### Production (.env)
```bash
PORT=5000
DEBUG=False
```

### Development (.env)
```bash
PORT=5000
DEBUG=True
```

### Copy example:
```bash
cp .env.example .env
# Edit .env with your settings
```

---

## Database

### View Tables
```bash
sqlite3 ai_assistant.db
```

### Key Tables
```sql
.tables
-- messages - Conversation history
-- patterns - Learned patterns
-- images_stored - Stored images metadata
-- memory_long_term - Long-term memories
-- personality - AI personality traits
```

### Check Stored Images
```sql
SELECT url, filename, created_at, expires_at FROM images_stored;
```

### Clear Everything (DEV ONLY)
```bash
rm ai_assistant.db
# App will recreate on next run
```

---

## Monitoring

### Check Server Status
```bash
curl http://localhost:5000/api/health
# Output: {"status": "ok", "service": "ai-assistant"}
```

### Monitor Learning Progress
```bash
curl http://localhost:5000/api/learning/progress
```

### Check Image Storage
```bash
curl http://localhost:5000/api/images
# Shows: total images, storage used, expiration times
```

### Monitor Scheduler
```bash
curl http://localhost:5000/api/scheduler/status
```

---

## Common Tasks

### Store a Memory
```bash
curl -X POST http://localhost:5000/api/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "key": "user_name",
    "value": "John",
    "importance": 0.9
  }'
```

### Recall a Memory
```bash
curl http://localhost:5000/api/memory/recall?key=user_name
```

### Export All Data
```bash
curl http://localhost:5000/api/learning/export > learning_backup.json
curl http://localhost:5000/api/memory/export > memory_backup.json
```

### Manually Fetch Web Page
```bash
curl -X POST http://localhost:5000/api/fetch-web \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

## Logs & Debugging

### Enable Verbose Logging
```bash
# In app.py, change logging level
logging.basicConfig(level=logging.DEBUG)
```

### Check Logs While Running
```bash
# In another terminal
tail -f app.log
```

### Test Components Individually
```python
from ai_engine.web_fetcher import WebFetcher
from ai_engine.image_manager import ImageManager

# Test web fetcher
fetcher = WebFetcher()
data = fetcher.fetch_page("https://example.com")
print(data)

# Test image manager
img_mgr = ImageManager()
result = img_mgr.store_image("https://example.com/image.jpg")
print(result)
```

---

## Troubleshooting

### API Won't Start
```bash
# Check port is available
lsof -i :5000

# Kill process if needed
kill -9 <PID>

# Check dependencies
pip install -r requirements.txt --upgrade
```

### Images Not Storing
```bash
# Check directory exists and is writable
mkdir -p storage/images
chmod 755 storage/images

# Check disk space
df -h
```

### Web Fetching Fails
```bash
# Test connectivity
curl https://en.wikipedia.org

# Check timeout setting
# In WebFetcher: timeout=10  # Change if needed
```

### Scheduler Not Running
```bash
# Check status
curl http://localhost:5000/api/scheduler/status

# Check logs
# Look for "Starting task scheduler" message
```

---

## Performance Tips

1. **Reduce web fetches**: Set `fetch_web: false` for simple questions
2. **Limit images**: Keep `IMAGE_MAX_COUNT=10` to control storage
3. **Cleanup often**: Set `CLEANUP_INTERVAL=1800` (30 min) for heavy usage
4. **Monitor memory**: Use `GET /api/images` to track storage
5. **Cache responses**: Store frequent questions as memories

---

## Security Notes

✅ **Secure:**
- No external API calls (everything local)
- URL validation before fetching
- Content size limits (5MB max)
- Timeout protection (10sec)
- No JavaScript execution

⚠️ **To Consider:**
- Use HTTPS in production
- Implement authentication for API
- Rate limit endpoints
- Validate user input
- Backup database regularly

---

## Python Examples

### Using Agent Directly
```python
from ai_engine.agent import AutonomousAgent

agent = AutonomousAgent()

# Simple message
result = agent.process_input("Hello")
print(result['response'])

# Force web fetch
result = agent.process_input("What is Python?", fetch_web=True)
print(f"Response: {result['response']}")
print(f"Images stored: {len(result['images'])}")

# Disable web
result = agent.process_input("Hello", fetch_web=False)
print(result['response'])
```

### Using Components
```python
from ai_engine.web_fetcher import WebFetcher
from ai_engine.image_manager import ImageManager
from ai_engine.context_inspector import ContextInspector

# Web fetcher
fetcher = WebFetcher()
data = fetcher.fetch_page("https://example.com")
print(f"Title: {data['title']}")
print(f"Images: {len(data['images'])}")

# Image manager
img_mgr = ImageManager()
stored = img_mgr.store_image("https://example.com/img.jpg")
print(f"Stored at: {stored['path']}")
print(f"Expires: {stored['expires_at']}")

# Context
context = ContextInspector()
context.add_context('web', 'https://example.com', 'content here', 0.9)
results = context.get_relevant_context('example')
print(f"Found {len(results)} relevant items")
```

---

## API Response Examples

### Chat Response
```json
{
  "success": true,
  "response": "Machine learning is a subset of artificial intelligence...",
  "web_data": {
    "url": "https://en.wikipedia.org/wiki/Machine_learning",
    "title": "Machine Learning - Wikipedia",
    "status": 200,
    "images_found": 12,
    "links_found": 45
  },
  "images": [
    {
      "url": "https://upload.wikimedia.org/wikipedia/...",
      "path": "storage/images/abc123.jpg",
      "size_bytes": 45678,
      "expires_at": "2024-12-20T10:30:00"
    }
  ],
  "timestamp": "2024-12-19T10:30:00"
}
```

### Images List Response
```json
{
  "success": true,
  "images": [
    {
      "url": "https://example.com/img1.jpg",
      "filename": "img1.jpg",
      "path": "storage/images/hash1.jpg",
      "size_bytes": 45678,
      "created_at": "2024-12-19T09:00:00",
      "expires_at": "2024-12-20T09:00:00",
      "accessed_count": 3,
      "last_accessed": "2024-12-19T10:00:00"
    }
  ],
  "total": 1
}
```

### Scheduler Status
```json
{
  "success": true,
  "scheduler": {
    "running": true,
    "tasks": {
      "cleanup_images": {
        "enabled": true,
        "interval": 3600,
        "last_run": "2024-12-19T09:00:00"
      }
    }
  }
}
```

---

## Useful Commands

```bash
# Start server with reload
python -m flask --app app run --reload

# Run tests
pytest tests/

# Profile performance
python -m cProfile -s cumulative app.py

# Check requirements
pip list | grep -i flask

# View process info
ps aux | grep python

# Test endpoint with jq
curl http://localhost:5000/api/health | jq .

# Continuous monitoring
watch -n 1 'curl -s http://localhost:5000/api/images | jq .total'
```

---

## Support

- **API Docs**: See `API_DOCUMENTATION.md`
- **Integration**: See `INTEGRATION_GUIDE.md`
- **Issues**: Check logs with `tail -f app.log`
- **Development**: See `../README.md`

