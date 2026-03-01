# AI Assistant - Architecture Document

## System Overview

```
┌─────────────────┐
│  Mobile App     │ (React Native / Android)
│  (Offline)      │
└────────┬────────┘
         │
         │ HTTP/REST API
         │
┌────────▼──────────────────┐
│    Backend Server         │ (Flask/Python)
│  ┌─────────────────────┐  │
│  │ AI Engine           │  │
│  │ - Agent             │  │
│  │ - Memory            │  │
│  │ - Learning System   │  │
│  │ - NLP Processor     │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Persistence Layer   │  │
│  │ - SQLite Database   │  │
│  │ - File Storage      │  │
│  └─────────────────────┘  │
└────────┬──────────────────┘
         │
┌────────▼──────────────────┐
│   Frontend (Web)          │ (React/TypeScript)
│   (Optional)              │
└───────────────────────────┘
```

## Components

### Backend (Python Flask)

#### AI Engine (`ai_engine/`)
- **Agent**: Main intelligence system
  - Processes natural language input
  - Generates responses based on learned patterns
  - Maintains personality traits
  
- **Memory**: Multi-tier memory system
  - Short-term: Session-level
  - Long-term: Persistent SQLite storage
  - Fact database for knowledge
  
- **Learning**: Continuous improvement
  - Records interactions
  - Learns user preferences
  - Tracks improvement metrics
  
- **NLP**: Natural language processing
  - Tokenization
  - Intent detection
  - Entity extraction
  - Similarity scoring

#### API Endpoints (`api/`)
- RESTful endpoints for client access
- Request validation
- Error handling
- Rate limiting (future)

#### Database Schema
```
messages
├── id (TEXT) - Unique message ID
├── user_input - User message
├── ai_response - AI response
├── timestamp - When message was sent
└── context - JSON metadata

patterns
├── user_keyword - Keyword learned
├── ai_response - Associated response
├── frequency - How often seen
└── last_used - Last usage time

memory_long_term
├── key - Memory key
├── value - Stored value (JSON)
├── importance - Relevance weight
├── recall_count - Times accessed
└── last_accessed - Last access time

memory_facts
├── subject - Fact subject
├── predicate - Relationship
├── object - Fact object
└── confidence - Certainty level

personality
├── trait - Personality trait
├── value - Trait score
└── timestamp - Last update

learn_interactions
├── input_text - User input
├── output_text - AI response
├── user_rating - User feedback
└── timestamp - Interaction time

learn_preferences
├── preference - User preference
├── confidence - Confidence score
└── last_updated - Last update time

learn_errors
├── error_text - Error description
├── context - Error context
├── timestamp - When occurred
└── resolved - If fixed
```

### Frontend (React)

Client interface for:
- Chat with AI
- View history
- Export/Import learning
- Monitor progress

### Mobile (React Native)

Native Android/iOS apps with:
- Offline chat capability
- Local storage of conversations
- Sync when online
- Native UI/UX

## Data Flow

### Chat Interaction
```
1. User sends message
   ↓
2. API receives POST /api/chat
   ↓
3. NLP processes input (tokenize, extract intent, entities)
   ↓
4. Agent checks memory for related facts
   ↓
5. Agent looks for matching patterns
   ↓
6. If no match, generates new response
   ↓
7. Learning system records interaction
   ↓
8. Memory system updates with new knowledge
   ↓
9. Response returned to client
```

### Learning Process
```
1. User rates response
   ↓
2. Learning system records rating
   ↓
3. Extract keywords from successful interaction
   ↓
4. Update pattern frequencies
   ↓
5. Adjust personality traits
   ↓
6. Update user preferences
   ↓
7. Improve future responses
```

## Deployment Models

### Model 1: cPanel Shared Hosting
```
User → Web Browser → cPanel Server (Flask)
                     ↓
                  SQLite DB
```
- Single process
- Limited resources
- No frontend build needed
- Easy updates

### Model 2: Local Development
```
User PC:
├── Browser → React Dev Server (Port 3000)
│            ↓
│          Flask Backend (Port 5000)
│            ↓
│          SQLite DB
└── Mobile → Flask Backend (if on same network)
```
- Full debugging
- Hot reload
- Optimal development experience

### Model 3: Mobile APK
```
Android Device:
├── React Native App (Offline)
│   └── Local Storage
└── When connected: Sync with Backend
```
- Offline capable
- Works standalone
- Cloud sync optional

## Security Architecture

### Data Protection
- SQLite encryption (future)
- Input validation
- SQL injection prevention
- XSS protection (React)

### API Security
- CORS configuration
- Rate limiting (future)
- Authentication tokens (future)
- HTTPS enforcement (production)

### User Privacy
- Local processing
- No external AI calls
- User data stays on device
- Export/delete options

## Performance Optimization

### Caching Strategy
- In-memory pattern cache
- Database query caching
- API response caching

### Database Optimization
- Indexed keyword searches
- Efficient fact queries
- Cleanup old messages

### Memory Management
- Conversation history limits
- Automatic cleanup
- Lazy loading

## Scalability Considerations

### Current Limitations
- Single Flask process
- SQLite (single writer)
- In-memory caching

### Future Improvements
- PostgreSQL for multi-instance
- Redis for caching
- Microservices separation
- Load balancing

## Monitoring & Debugging

### Logging
- Structured logging
- Log levels (DEBUG, INFO, WARNING, ERROR)
- File rotation
- Timestamp tracking

### Metrics
- Response times
- Learning progress
- Error rates
- API usage

### Health Checks
- `/api/health` endpoint
- Database connectivity
- Memory usage
- Performance metrics

