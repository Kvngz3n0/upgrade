# Quick Start Guide - AI Assistant

## 🚀 30-Second Start

### Backend Only
```bash
cd backend
python3 app.py
# Open: http://localhost:5000/api/health
```

### Full Local Stack
```bash
# Terminal 1
cd backend && python3 app.py

# Terminal 2
cd frontend && npm install && npm start
# Open: http://localhost:3000
```

## 📱 Mobile

See [ANDROID_SETUP.md](docs/ANDROID_SETUP.md) for APK building

## ☁️ cPanel Hosting

See [CPANEL_SETUP.md](docs/CPANEL_SETUP.md) for deployment

## 🧠 First Chat

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! What is your name?"}'
```

The AI will respond and start learning from you!

## 💾 Check What It Learned

```bash
curl http://localhost:5000/api/learning/progress
```

## 📚 Complete Documentation

- [Architecture](docs/ARCHITECTURE.md) - How it works
- [API Reference](docs/API.md) - All endpoints
- [Local Development](docs/LOCAL_SETUP.md) - Full setup
- [cPanel Deployment](docs/CPANEL_SETUP.md) - Server setup
- [Android Build](docs/ANDROID_SETUP.md) - Mobile app

## 🔧 Configuration

Edit `backend/.env`:
- `PORT`: Server port (default: 5000)
- `DEBUG`: Enable debugging (default: False)
- `DATABASE_PATH`: Database file location

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` | `pip install -r requirements.txt` |
| `Port already in use` | Change PORT in .env or kill other process |
| `Database locked` | Restart with fresh database |
| `Import errors` | Check Python version is 3.7+ |

## 📖 Project Structure

```
ai-assistant-project/
├── backend/              # Python Flask backend
│   ├── ai_engine/        # AI core components
│   ├── api/              # REST API endpoints
│   └── app.py            # Main application
├── frontend/             # React web interface (optional)
├── mobile/               # React Native Android app
├── docs/                 # Comprehensive documentation
└── README.md            # Full project overview
```

## ✨ Key Features

- 🤖 **Autonomous Learning** - Gets smarter with every conversation
- 💾 **Persistent Memory** - Remembers across sessions
- 🔄 **Multi-Platform** - Web, cPanel, and Mobile
- 📊 **Learning Analytics** - Track progress
- 🔐 **Privacy First** - All processing local
- 📦 **Export/Import** - Backup learning data

## 🎯 Next Steps

1. ✅ Complete installation
2. 📝 Have a few conversations
3. 📊 Check learning progress
4. 🔄 Export/import data
5. 📱 Build mobile APK (optional)
6. ☁️ Deploy to cPanel (optional)

## 💬 Example Conversations

```
User: "My favorite color is blue"
AI: I'll remember that your favorite color is blue.

User: "What's my favorite color?"
AI: Your favorite color is blue, as you mentioned earlier!

User: "I'm learning Python"
AI: Great! Python is a wonderful programming language to learn.

User: "Tell me about my interests"
AI: Based on our conversations, I've learned you enjoy Python and like the color blue!
```

## 📞 Support

For issues:
1. Check relevant documentation
2. Review logs: `backend/logs/`
3. Test with curl: `/api/health`
4. Enable DEBUG mode for more details

## 🔐 Security Notes

- ✅ No external API calls
- ✅ All data stays local
- ✅ No tracking/analytics
- ✅ Open source

Set `DEBUG=False` in production!

---

**Happy chatting!** 🎉

