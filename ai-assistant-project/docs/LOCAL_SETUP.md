# AI Assistant - Local Development Guide

## Overview
Full-stack development setup for local machine with hot reload and debugging.

## System Requirements
- Python 3.8+
- Node.js 16+ (for React frontend)
- npm or yarn
- Git

## Backend Setup

### 1. Install Python Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Create .env File
```bash
cp .env.example .env
echo "DEBUG=True" >> .env
echo "PORT=5000" >> .env
```

### 3. Run Backend
```bash
python3 app.py
```

Backend runs on `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Create .env File
```bash
echo "REACT_APP_API_URL=http://localhost:5000" > .env
```

### 3. Start Development Server
```bash
npm start
```

Frontend runs on `http://localhost:3000`

## Full Stack Development

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
python3 app.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

Both will hot reload on changes.

## Database

SQLite database (`ai_assistant.db`) is created automatically in backend directory.

### View Database
```bash
sqlite3 backend/ai_assistant.db
.tables  # List tables
.schema  # Show schema
SELECT * FROM messages;
```

### Reset Database
```bash
rm backend/ai_assistant.db
# It will be recreated on restart
```

## Testing

### Test Backend
```bash
curl http://localhost:5000/api/health
```

### Test Chat
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Check Learning
```bash
curl http://localhost:5000/api/learning/progress
```

## Debugging

### Python Debugging
```bash
# In backend, add to app.py
import pdb; pdb.set_trace()
```

### View Logs
```bash
tail -f logs/*.log
```

## Performance Tuning

### Backend Performance
```python
# Add caching in app.py
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
```

### Frontend Performance
```bash
npm run build  # Production build
```

## Database Backup

```bash
cp backend/ai_assistant.db backend/ai_assistant.db.backup
```

## Mobile Testing

### Access from Mobile Device
```bash
# Get your computer's IP
ifconfig | grep "inet "

# On mobile, use: http://<YOUR_IP>:3000
```

## Troubleshooting

- **Port already in use**: Kill process `lsof -i :5000`
- **Module not found**: `pip install --upgrade pip`
- **Node modules issue**: `rm -rf node_modules && npm install`

## Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
gunicorn -w 4 app:app
```

