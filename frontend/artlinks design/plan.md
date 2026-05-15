# Artlinks — React + Django REST Framework Integration Plan

## Project Structure Decision

**Recommendation: Monorepo** — place the React frontend inside the existing Django project repo under a `frontend/` subdirectory.

```
artlinks-project/          ← existing Django repo root
├── manage.py
├── artlinks/              ← Django app(s)
├── config/                ← Django settings, urls, wsgi
├── requirements.txt
└── frontend/              ← NEW: Vite React project lives here
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── components/
    │   ├── hooks/
    │   ├── api/
    │   └── assets/
    ├── public/
    └── dist/              ← build output (gitignored)
```

**Why monorepo:**
- Single git history covers coordinated frontend + backend changes
- Simpler local dev setup and onboarding
- Django can optionally serve the built React bundle in production
- Separation of concerns stays clear without the overhead of syncing two repos

**When to use separate repos instead:** only if the frontend and backend will be deployed independently by different teams, or if the frontend will be reused across multiple backends.

---

## Frontend Migration (CDN React → Vite React)

The current prototype uses React via CDN + in-browser Babel. This needs to become a proper build pipeline.

### Steps

1. **Scaffold Vite project** inside `frontend/`
   ```bash
   cd frontend
   npm create vite@latest . -- --template react
   npm install
   ```

2. **Move existing files**
   - `components/app.jsx` → `frontend/src/App.jsx` (split into smaller components)
   - `components/icons.jsx` → `frontend/src/components/Icons.jsx`
   - `styles.css` → `frontend/src/styles.css` (import in `main.jsx`)

3. **Add dependencies**
   ```bash
   npm install axios react-router-dom
   # Optional but recommended for server state:
   npm install @tanstack/react-query
   ```

4. **Replace hardcoded seed data** with API calls
   - All links/collections currently live in `app.jsx` state
   - Replace with `useEffect` + `axios` (or React Query) fetching from DRF endpoints

5. **Add auth handling**
   - Login/logout flow
   - Store JWT in `localStorage` or `httpOnly` cookie (cookie preferred for security)
   - Protect routes with a `<PrivateRoute>` wrapper

6. **Configure Vite proxy** for local dev (avoids CORS during development)
   ```js
   // vite.config.js
   export default {
     server: {
       proxy: {
         '/api': 'http://localhost:8000'
       }
     }
   }
   ```

---

## Backend (Django REST Framework)

Assumes an existing Django project. These are the additions needed to support this frontend.

### Dependencies to add
```
djangorestframework
djangorestframework-simplejwt
django-cors-headers
Pillow                      # for image/upload handling
```

### Models needed

| Model | Key Fields |
|---|---|
| `Link` | `user`, `title`, `url`, `description`, `collection`, `tags`, `is_featured`, `created_at` |
| `Collection` | `user`, `name`, `slug`, `description`, `color`, `created_at` |
| `Tag` | `name`, `slug` |
| `Profile` | `user` (OneToOne), `display_name`, `bio`, `avatar`, `theme_variant`, `theme_palette` |

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/token/` | Get JWT access + refresh tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh access token |
| `GET/POST` | `/api/links/` | List all links / create link |
| `GET/PUT/DELETE` | `/api/links/<id>/` | Retrieve, update, delete a link |
| `GET/POST` | `/api/collections/` | List all collections / create collection |
| `GET/PUT/DELETE` | `/api/collections/<id>/` | Retrieve, update, delete a collection |
| `GET/PUT` | `/api/profile/` | Get or update the current user's profile |
| `GET` | `/api/profile/<username>/` | Public profile view (no auth required) |
| `POST` | `/api/uploads/` | Upload an asset (image, etc.) |

### Settings additions

```python
INSTALLED_APPS += [
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
]

MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', ...existing...]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite dev server
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

---

## Open Questions (Decisions Needed Before Building)

1. **Single-user or multi-user?**
   - Single-user: simpler models, no need for per-user filtering on every query
   - Multi-user: each person has their own links, collections, and public profile page

2. **Auth method?**
   - JWT (stateless, works well for SPAs) — recommended
   - Django session auth (simpler if Django is also serving the frontend)

3. **Production hosting?**
   - Option A: Separate — React on Vercel/Netlify, Django on Render/Railway
   - Option B: Together — Django serves the Vite `dist/` build as static files (one server, simpler)

4. **Public profile feature?**
   - The current prototype has a Profile route — should `/<username>` be publicly accessible without login?

---

## Build & Deployment (when ready)

### Option A: Django serves the React build (single server)

```python
# urls.py — catch-all to serve React's index.html
from django.views.generic import TemplateView
urlpatterns += [re_path(r'^.*$', TemplateView.as_view(template_name='index.html'))]
```

```bash
# Build frontend, copy dist into Django's staticfiles
cd frontend && npm run build
# Point Django's STATICFILES_DIRS to frontend/dist
```

### Option B: Separate deployment

- React → deploy `frontend/dist` to Vercel or Netlify
- Django → deploy to Render, Railway, or Fly.io
- Update `CORS_ALLOWED_ORIGINS` to include the production frontend URL

---

## Current Assets to Preserve

| Asset | Status | Notes |
|---|---|---|
| `styles.css` | Keep as-is | Move to `frontend/src/styles.css` |
| `components/app.jsx` | Migrate | Split into smaller components, strip seed data |
| `components/icons.jsx` | Migrate | Move to `frontend/src/components/Icons.jsx` |
| `uploads/` | Migrate to Django `media/` | Django handles file serving via `MEDIA_ROOT` |
| `artlinks.html` | Can be removed | Was a CDN prototype, replaced by Vite |
| `index.html` (root) | Can be removed | Replaced by Vite's `index.html` |
