Retro React frontend (Vite) integrated with backend `/api/chat`.

Quick start:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` (Vite default).

Notes:
- UI follows retro black & gold pixel theme.
- Messages are sent to `/api/chat` (same origin). Ensure the backend is running on the same host/port or configure a proxy.
- Images returned by `/api/chat` should include `path` or `url` fields; the frontend will show up to 10 images.

This folder still contains the legacy static scaffold (`index.html`, `style.css`, `app.js`) for quick preview; use the Vite app for development.