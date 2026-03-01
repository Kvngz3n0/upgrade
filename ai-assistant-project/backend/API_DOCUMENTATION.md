# AI Assistant API Documentation

## Overview
The AI Assistant API provides a comprehensive REST interface for interacting with an autonomous AI agent that learns from conversations, fetches web data, manages images, and maintains contextual memory.

## Base URL
```
http://localhost:5000/api
```

## Core Endpoints

### 1. Health Check
**Endpoint:** `GET /api/health`

**Description:** Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "service": "ai-assistant"
}
```

---

### 2. Chat / Process Message
**Endpoint:** `POST /api/chat`

**Description:** Send a message to the AI and receive a response. Supports optional automatic web data fetching.

**Request Body:**
```json
{
  "message": "What is machine learning?",
  "fetch_web": null
}
```

**Parameters:**
- `message` (string, required): The user message to send
- `fetch_web` (boolean, optional): 
  - `null/omitted`: Auto-detect if web fetch is needed
  - `true`: Force web fetching
  - `false`: Don't fetch web data

**Response:**
```json
{
  "success": true,
  "response": "Machine learning is a subset of artificial intelligence...",
  "web_data": {
    "url": "https://example.com",
    "title": "Machine Learning - Wikipedia",
    "description": "...",
    "status": 200
  },
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "path": "storage/images/abc123.jpg",
      "size_bytes": 45678,
      "expires_at": "2024-12-20T10:30:00"
    }
  ],
  "timestamp": "2024-12-19T10:30:00"
}
```

---

### 3. Conversation History
**Endpoint:** `GET /api/chat/history?limit=50`

**Description:** Retrieve conversation history.

**Parameters:**
- `limit` (integer, optional): Maximum number of messages to return. Default: 50

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "msg_abc123",
      "user_input": "Hello",
      "ai_response": "Hello! How can I assist you?",
      "timestamp": "2024-12-19T10:00:00",
      "context": {}
    }
  ],
  "total": 1
}
```

---

### 4. Rate Response
**Endpoint:** `POST /api/chat/rate`

**Description:** Rate an AI response to help improve the learning system.

**Request Body:**
```json
{
  "message_id": "msg_abc123",
  "rating": 4
}
```

**Parameters:**
- `message_id` (string): ID of the message to rate
- `rating` (integer): Rating from 1 to 5 (1=poor, 5=excellent)

**Response:**
```json
{
  "success": true,
  "message": "Rating recorded"
}
```

---

## Memory Management Endpoints

### 5. Recall Memory
**Endpoint:** `GET /api/memory/recall?key=user_name`

**Description:** Retrieve a memory by key.

**Parameters:**
- `key` (string, required): The memory key to recall

**Response:**
```json
{
  "success": true,
  "key": "user_name",
  "value": "John"
}
```

---

### 6. Store Memory
**Endpoint:** `POST /api/memory/store`

**Description:** Store a memory or fact.

**Request Body:**
```json
{
  "key": "user_name",
  "value": "John",
  "importance": 0.8
}
```

**Parameters:**
- `key` (string, required): The memory key
- `value` (string, required): The memory value
- `importance` (float, optional): Importance weight (0.0-1.0). Default: 0.5

**Response:**
```json
{
  "success": true,
  "message": "Memory stored"
}
```

---

### 7. Export Memory
**Endpoint:** `GET /api/memory/export`

**Description:** Export all stored memories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "user_name",
      "value": "John",
      "importance": 0.8
    }
  ]
}
```

---

## Learning Endpoints

### 8. Learning Progress
**Endpoint:** `GET /api/learning/progress`

**Description:** Get learning statistics and top learned patterns.

**Response:**
```json
{
  "success": true,
  "progress": {
    "total_interactions": 45,
    "avg_rating": 4.2,
    "learned_preferences": 12
  },
  "top_learnings": [
    {
      "word": "python",
      "confidence": 0.95
    }
  ]
}
```

---

### 9. Import Learning Data
**Endpoint:** `POST /api/learning/import`

**Description:** Import learning data from exported backup.

**Request Body:**
```json
{
  "data": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Learning data imported"
}
```

---

### 10. Export Learning Data
**Endpoint:** `GET /api/learning/export`

**Description:** Export all learning data for backup or migration.

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

---

## Web Fetching Endpoints

### 11. Fetch Web Data
**Endpoint:** `POST /api/fetch-web`

**Description:** Manually fetch and parse web content from a URL.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "Example description",
  "content": "Example content preview (first 500 chars)...",
  "images_found": 5,
  "links_found": 12,
  "status": 200
}
```

**Error Response:**
```json
{
  "error": "URL required"
}
```

---

## Image Management Endpoints

### 12. List Stored Images
**Endpoint:** `GET /api/images?limit=10`

**Description:** Retrieve list of stored images with metadata.

**Parameters:**
- `limit` (integer, optional): Maximum images to return. Default: 10

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "filename": "image1.jpg",
      "path": "storage/images/abc123.jpg",
      "size_bytes": 45678,
      "created_at": "2024-12-19T10:00:00",
      "expires_at": "2024-12-20T10:00:00",
      "accessed_count": 3,
      "last_accessed": "2024-12-19T15:30:00"
    }
  ],
  "total": 1
}
```

---

### 13. Delete Image
**Endpoint:** `DELETE /api/images/<image_id>`

**Description:** Delete a specific stored image.

**Path Parameters:**
- `image_id` (integer): The ID of the image to delete

**Response:**
```json
{
  "success": true,
  "message": "Image 1 deleted"
}
```

---

### 14. Cleanup Expired Images
**Endpoint:** `POST /api/images/cleanup`

**Description:** Manually trigger cleanup of expired images (older than 24 hours).

**Response:**
```json
{
  "success": true,
  "message": "Expired images cleaned up"
}
```

---

## Context Inspection Endpoints

### 15. Get Context
**Endpoint:** `GET /api/context?query=python&type=web`

**Description:** Retrieve contextual information based on a query.

**Parameters:**
- `query` (string, optional): Search query for relevant context
- `type` (string, optional): Filter by context type (web, memory, fact, etc.)

**Response:**
```json
{
  "success": true,
  "context": [
    {
      "id": 1,
      "type": "web",
      "source": "https://en.wikipedia.org/wiki/Python",
      "content": "Python is a programming language...",
      "relevance": 0.92,
      "created_at": "2024-12-19T10:00:00"
    }
  ],
  "total": 5
}
```

---

## Task Scheduler Endpoints

### 16. Get Scheduler Status
**Endpoint:** `GET /api/scheduler/status`

**Description:** Get the status of background task scheduler.

**Response:**
```json
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

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad Request (missing/invalid parameters) |
| 404 | Endpoint not found |
| 500 | Internal server error |
| 503 | Service unavailable (component not initialized) |

**Error Response Format:**
```json
{
  "error": "Description of the error"
}
```

---

## Features

### Automatic Web Fetching
The AI automatically detects when web data is needed using keyword analysis:
- Detects queries about "what", "how", "tell me", "find", "current", "latest", "news"
- Can be overridden with `fetch_web` parameter in `/api/chat`

### Image Management
- **Automatic limiting**: Max 10 images stored at any time
- **Auto-expiration**: Images automatically deleted after 24 hours
- **Background cleanup**: Runs hourly via TaskScheduler daemon

### Context-Aware Responses
- Uses memory, learned patterns, and web data to inform responses
- Tracks relevance scores for context retrieval
- Builds enhanced prompts with relevant context

### Learning System
- Records all interactions and user ratings
- Tracks most frequently asked topics
- Maintains learning progress statistics

---

## Example Usage

### Python Requests
```python
import requests

BASE_URL = "http://localhost:5000/api"

# Send a message
response = requests.post(
    f"{BASE_URL}/chat",
    json={"message": "What is Python?"},
)
print(response.json())

# Get learning progress
progress = requests.get(f"{BASE_URL}/learning/progress")
print(progress.json())

# Store a memory
requests.post(
    f"{BASE_URL}/memory/store",
    json={"key": "user_name", "value": "Alice", "importance": 0.9}
)
```

### cURL
```bash
# Chat endpoint
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "fetch_web": false}'

# Get conversation history
curl http://localhost:5000/api/chat/history?limit=10

# Health check
curl http://localhost:5000/api/health
```

---

## Notes

- All timestamps are in ISO 8601 format
- Images are stored in `storage/images/` directory with hash-based filenames
- Database persistence uses SQLite in `ai_assistant.db`
- CORS is enabled for all API endpoints from any origin
- Web fetching timeout: 10 seconds
- Maximum content size: 5MB

