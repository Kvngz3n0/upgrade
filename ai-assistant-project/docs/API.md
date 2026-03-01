# AI Assistant - API Reference

## Base URL
- Development: `http://localhost:5000`
- Production: `https://yourdomain.com`

## Authentication
Currently no authentication required. For production, add JWT tokens.

## Response Format
All responses are JSON.

### Success Response
```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

## Endpoints

### Health Check
```
GET /api/health
```

Returns server status.

**Response:**
```json
{
  "status": "ok",
  "service": "ai-assistant"
}
```

---

### Send Message
```
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?"
}
```

Send a message to the AI assistant.

**Request:**
```json
{
  "message": "string (required) - User message"
}
```

**Response:**
```json
{
  "success": true,
  "response": "I'm doing well, thank you for asking!",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Status Codes:**
- 200: Success
- 400: Missing message
- 500: Server error

---

### Get Conversation History
```
GET /api/chat/history?limit=50
```

Retrieve past conversations.

**Query Parameters:**
- `limit` (integer, default: 50) - Number of messages to return

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "abc123",
      "user_input": "Hello",
      "ai_response": "Hi there!",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "context": {}
    }
  ],
  "total": 1
}
```

---

### Rate Response
```
POST /api/chat/rate
Content-Type: application/json

{
  "message_id": "abc123",
  "rating": 5
}
```

Rate an AI response for learning.

**Request:**
```json
{
  "message_id": "string (required)",
  "rating": "integer (1-5, required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating recorded"
}
```

---

### Recall Memory
```
GET /api/memory/recall?key=user_name
```

Retrieve a stored memory.

**Query Parameters:**
- `key` (string, required) - Memory key to recall

**Response:**
```json
{
  "success": true,
  "key": "user_name",
  "value": "John"
}
```

---

### Store Memory
```
POST /api/memory/store
Content-Type: application/json

{
  "key": "user_name",
  "value": "John",
  "importance": 0.8
}
```

Store something in long-term memory.

**Request:**
```json
{
  "key": "string (required)",
  "value": "any (required)",
  "importance": "float (0-1, optional, default: 0.5)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Memory stored"
}
```

---

### Export Memory
```
GET /api/memory/export
```

Export all stored memories.

**Response:**
```json
{
  "success": true,
  "data": {
    "memories": {
      "user_name": {
        "value": "John",
        "importance": 0.8
      }
    },
    "facts": [
      {
        "subject": "John",
        "predicate": "likes",
        "object": "coffee",
        "confidence": 1.0
      }
    ]
  }
}
```

---

### Get Learning Progress
```
GET /api/learning/progress
```

Get AI learning statistics.

**Response:**
```json
{
  "success": true,
  "progress": {
    "total_interactions": 150,
    "average_rating": 4.2,
    "learned_preferences": 45,
    "unresolved_errors": 2
  },
  "top_learnings": [
    {
      "word": "coffee",
      "confidence": 0.95
    }
  ]
}
```

---

### Import Learning Data
```
POST /api/learning/import
Content-Type: application/json

{
  "patterns": [...],
  "personality": {...}
}
```

Import previously exported learning data.

**Request:**
See Export Learning for data format.

**Response:**
```json
{
  "success": true,
  "message": "Learning data imported"
}
```

---

### Export Learning Data
```
GET /api/learning/export
```

Export all AI learning data.

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "keyword": "hello",
        "response": "Hi there!",
        "frequency": 10
      }
    ],
    "personality": {
      "responsiveness": 0.8
    },
    "export_date": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Endpoint not found |
| 500 | Server Error | Internal error |

## Rate Limiting

Not currently implemented. Will add in production version.

Proposed limits:
- 60 requests per minute per IP
- 1000 requests per day per user

## Pagination

Not implemented for history. Use `limit` parameter instead.

## Filtering

Future implementation:
- Filter by date range
- Filter by rating
- Search by keywords

## Webhooks

Not implemented. Could be added for:
- Message notifications
- Learning alerts
- Error notifications

## WebSocket Support

Could be added for:
- Real-time conversation
- Live learning updates
- Multi-device sync

## Version History

### v1.0.0 (Current)
- Basic chat functionality
- Message history
- Memory storage
- Learning tracking
- Export/import

### v1.1.0 (Planned)
- Authentication
- Rate limiting
- Webhook support
- WebSocket support

