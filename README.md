# Web Scraper App

A consolidated web scraping application with enhanced crawler and scraping capabilities.

## Overview
- Fast HTML scraping and JavaScript-rendered scraping
- Website crawling with depth and page limits
- Social username lookup
- Realistic request headers with rotating browser user agents
- Imported user-agent generator under `import/`
- External client reference copied into `import/client/` for scraper and lookup improvements
- Android image scaling references available in `import/IMAGE_SCALING_REFERENCES.md`, including `Kvngz3n0/Imge-deecoder` and `imagescaler` examples
- Media lookup site extension guidance available in `import/MEDIA_LOOKUP_EXTENSIONS.md`

## Key folders
- `server/` — backend API and scraper logic
- `client/` — frontend interface
- `import/` — imported repository assets and user-agent refresh script

## GitHub APK build
- A GitHub Actions workflow is available at `.github/workflows/apk-build.yml`.
- On push or manual dispatch, it will build the Android debug APK and upload it as an artifact.

## Quick start
```bash
npm run install-all
npm run build
npm run start:server
```

Visit:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
