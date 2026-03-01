#!/bin/bash
# AI Assistant Installation Script

echo "🤖 Installing Autonomous AI Assistant..."
echo ""

# Check Python
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Upgrade pip
echo "📦 Upgrading pip..."
python3 -m pip install --upgrade pip --quiet

# Install requirements
echo "📥 Installing Python dependencies..."
pip install --user --no-cache-dir -r backend/requirements.txt

# Create directories
echo "📁 Creating directories..."
mkdir -p backend/logs
mkdir -p backend/data

# Create .env if not exists
if [ ! -f backend/.env ]; then
    echo "⚙️  Creating .env file..."
    cp backend/.env.example backend/.env
fi

# Test import
echo "🧪 Testing Python imports..."
python3 -c "from backend.app import app; print('✓ Application imports successfully')"

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 To start the AI Assistant:"
echo ""
echo "   Backend:"
echo "   cd backend && python3 app.py"
echo ""
echo "📖 For more help, see:"
echo "   - docs/CPANEL_SETUP.md (for cPanel hosting)"
echo "   - docs/LOCAL_SETUP.md (for local development)"
echo "   - docs/ANDROID_SETUP.md (for Android APK)"
echo "   - docs/API.md (API reference)"
echo ""
