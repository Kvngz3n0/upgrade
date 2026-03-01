# cPanel Web Scraper & Gallery Deployment Guide

## Overview
This is a **pure Python** web scraper optimized for cPanel shared hosting. It requires NO Node.js or frontend build tools.

## Features
✅ Media extraction with gallery display  
✅ Website crawling  
✅ Social media profile lookup  
✅ Lightweight (minimal dependencies)  
✅ Error-resistant  
✅ No JavaScript compilation needed  

## Requirements
- Python 3.7+
- cPanel access
- SSH access (recommended)

## Installation

### Option 1: SSH Installation (Recommended)

```bash
# 1. Connect via SSH and navigate to your public_html
cd ~/public_html
mkdir scraper
cd scraper

# 2. Clone or upload the files
# (upload the files here)

# 3. Run installation
chmod +x install.sh
./install.sh

# 4. Create a .env file
cp .env.example .env
# Edit .env with your settings
```

### Option 2: cPanel File Manager
1. Upload all files to a subdirectory in public_html (e.g., scraper/)
2. Right-click install.sh → Change Permissions → 755 or 775
3. Run via terminal or schedule as cron job

## Running the Server

### Development Mode
```bash
python3 app.py
```

### Production Mode (Recommended for cPanel)
```bash
# Install gunicorn
pip3 install --user gunicorn

# Run with gunicorn
gunicorn -w 4 -b 127.0.0.1:5000 wsgi:app
```

## cPanel Setup with Addon Domain

1. **Create Addon Domain** in cPanel
2. **Create custom port**:
   - In cPanel → Feature Manager → Ports → Add Port 5000
   
3. **Setup Reverse Proxy** (if using main domain):
   - In cPanel → Domains → select domain → Edit Redirects
   - Or use .htaccess for URL rewriting

4. **Example .htaccess** (in scraper directory):
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /scraper/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ http://127.0.0.1:5000/ [QSA,P,L]
</IfModule>
```

## Scaling & Performance

### Tuning gunicorn
```bash
# For shared hosting (2-4 workers)
gunicorn -w 2 -b 127.0.0.1:5000 --timeout 30 wsgi:app

# For dedicated server (8+ workers)
gunicorn -w 8 -b 0.0.0.0:5000 --timeout 60 wsgi:app
```

### Enable Caching
Edit app.py to add caching for repeat scrapes:
```python
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/scrape/media', methods=['POST'])
@cache.cached(timeout=300)
def scrape_media():
    # ...
```

## API Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Basic Scrape
```bash
curl -X POST http://localhost:5000/api/scrape/basic \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### Media Extraction
```bash
curl -X POST http://localhost:5000/api/scrape/media \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","media_types":["images","videos"]}'
```

### Website Crawl
```bash
curl -X POST http://localhost:5000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","max_depth":2,"max_pages":50}'
```

### Social Lookup
```bash
curl -X POST http://localhost:5000/api/social \
  -H "Content-Type: application/json" \
  -d '{"username":"example123"}'
```

## Troubleshooting

### "Command not found: python3"
```bash
# Try python instead
python --version
# Update scripts to use python instead of python3
```

### "ModuleNotFoundError" for requests/bs4
```bash
# Reinstall with --user flag
pip3 install --user --upgrade requests beautifulsoup4 lxml
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Timeout Errors
- Increase timeout in gunicorn: `--timeout 120`
- Reduce max_pages in crawl requests
- Check server logs: `tail -f logs/scraper*.log`

## Security Notes

⚠️ **For Production:**
1. Set `DEBUG=False` in .env
2. Implement rate limiting
3. Add authentication if needed
4. Use HTTPS only
5. Whitelist allowed domains

```python
# Add rate limiting
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/scrape/media', methods=['POST'])
@limiter.limit("10 per minute")
def scrape_media():
    # ...
```

## Logs

Logs are stored in `logs/` directory with daily rotation:
```bash
tail -f logs/scraper_*.log
```

## Maintenance

### Regular Cleanup
```bash
# Clean old results
find scrape_results -mtime +30 -delete

# Clear temp uploads
find temp_uploads -mtime +1 -delete
```

### Database Backup
```bash
# Create backup of results
tar -czf scraper_backup_$(date +%Y%m%d).tar.gz scrape_results/
```

## FAQ

**Q: Can I run multiple instances?**  
A: Yes, use different ports: `-b 127.0.0.1:5001`, `-b 127.0.0.1:5002`

**Q: How do I deploy to a subdomain?**  
A: Create addon domain, repeat installation in subdomain folder

**Q: What's the memory usage?**  
A: ~50-100MB idle, depends on page complexity. Suitable for shared hosting.

**Q: Can I run this without SSH?**  
A: Yes, upload files and use cPanel Terminal/Console features

## Support

For issues:
1. Check logs: `tail -f logs/scraper*.log`
2. Test health endpoint: `curl http://localhost:5000/api/health`
3. Verify Python version: `python3 --version`
4. Test module imports: `python3 -c "import requests; print('OK')"`

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Compatible with:** cPanel/WHM, Shared Hosting, Dedicated Servers
