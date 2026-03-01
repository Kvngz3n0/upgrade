#!/bin/bash
# cPanel Scraper Installation & Setup Script

echo "🚀 Installing cPanel Web Scraper..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Upgrade pip
echo "📦 Upgrading pip..."
python3 -m pip install --upgrade pip --quiet

# Install requirements with cPanel-compatible options
echo "📥 Installing dependencies (this may take a few minutes)..."
pip install --user --no-cache-dir -r requirements.txt

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p scrape_results
mkdir -p temp_uploads

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✓ .env created. Edit it with your settings."
fi

# Test the application
echo "🧪 Testing application..."
python3 -c "from app import app; print('✓ Application imports successfully')" && echo "✓ All checks passed!"

echo ""
echo "✅ Installation complete!"
echo ""
echo "To run the server:"
echo "  python3 app.py"
echo ""
echo "For cPanel deployment with gunicorn:"
echo "  pip3 install --user gunicorn"
echo "  gunicorn -w 4 -b 127.0.0.1:5000 wsgi:app"
echo ""
