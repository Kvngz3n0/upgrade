# AI Assistant - cPanel Deployment Guide

## Overview
Deploy the autonomous AI assistant on shared cPanel hosting without Node.js.

## Requirements
- Python 3.7+
- cPanel account
- SSH access (recommended)

## Installation Steps

### 1. SSH Setup
```bash
cd ~/public_html
mkdir ai-assistant
cd ai-assistant
```

### 2. Upload Files
Upload the `backend/` directory contents

### 3. Install Dependencies
```bash
python3 -m pip install --user -r requirements.txt
```

### 4. Create .env File
```bash
cp .env.example .env
```

## Running on cPanel

### Option A: Using gunicorn (Recommended)
```bash
pip3 install --user gunicorn
gunicorn -w 2 -b 127.0.0.1:5000 app:app
```

### Option B: Direct Python
```bash
python3 app.py
```

### Option C: As cron job (Persistent)
```bash
*/5 * * * * cd ~/public_html/ai-assistant && python3 app.py >> ai.log 2>&1
```

## Access the API

Replace `yourdomain.com` with your actual domain:

### Chat with AI
```bash
curl -X POST https://yourdomain.com:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Get History
```bash
curl https://yourdomain.com:5000/api/chat/history
```

### Check Learning Progress
```bash
curl https://yourdomain.com:5000/api/learning/progress
```

## Reverse Proxy Setup (if needed)

In cPanel → Domains, add proxy directive for port 5000

## Troubleshooting

- Check logs: `tail -f ai.log`
- Test import: `python3 -c "from app import app; print('OK')"`
- Verify port: `lsof -i :5000`

## Security Notes

1. Set `DEBUG=False` in .env
2. Use HTTPS only
3. Implement rate limiting in production
4. Regular backups of SQLite database

