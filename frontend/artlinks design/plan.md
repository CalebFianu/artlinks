# Artlinks — Implementation Plan & Record

> This document was originally a planning spec. It has been updated to reflect what was actually built.

---

## Project Structure

Monorepo — React frontend lives inside the Django repo under `frontend/`.

```
artlinks/
├── manage.py
├── artlinks/                   ← Django project config (settings, urls, wsgi)
├── core/                       ← Django app (models, views, serializers, urls)
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── permissions.py
│   └── social_auth.py
├── db.sqlite3                  ← SQLite dev database
├── venv/                       ← Python virtual environment
└── frontend/                   ← Vite + React project
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env                    ← gitignored (VITE_API_BASE_URL)
    ├── .env.example            ← checked in template
    ├── .env.production         ← production URL placeholder
    ├── .gitignore
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles.css          ← verbatim copy of prototype's styles.css
        ├── landing.css         ← landing-page-specific styles
        ├── api/
        │   ├── client.js
        │   ├── auth.js
        │   ├── links.js
        │   └── collections.js
        ├── context/
        │   ├── AuthContext.jsx
        │   └── TweaksContext.jsx
        ├── hooks/
        │   ├── useLinks.js
        │   ├── useCollections.js
        │   └── useToast.js
        ├── components/
        │   ├── Icons.jsx
        │   ├── Sidebar.jsx
        │   ├── LinkRow.jsx
        │   ├── LinkModal.jsx
        │   ├── NewCollectionModal.jsx
        │   ├── Toast.jsx
        │   └── PrivateRoute.jsx
        └── pages/
            ├── LandingPage.jsx
            ├── LoginPage.jsx
            ├── SignupPage.jsx
            ├── DashboardPage.jsx
            ├── CollectionsPage.jsx
            ├── FeaturedPage.jsx
            ├── DailyPage.jsx
            └── PublicProfilePage.jsx
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend build | Vite 6 + React 18 |
| Routing | react-router-dom v6 |
| HTTP | axios 1.7 |
| Auth | JWT via `localStorage` |
| Backend | Django 5.1.2 + Django REST Framework |
| Auth tokens | djangorestframework-simplejwt |
| CORS | django-cors-headers |
| API docs | drf-spectacular (Swagger at `/api/docs/`) |
| Database | SQLite (dev) / PostgreSQL (prod) |

---

## Environment Variables

All API URLs come from a single env var. No hardcoded URLs in source code.

**.env** (gitignored, local dev):
```
VITE_API_BASE_URL=http://localhost:8000/api
```

**.env.production** (checked in, no secrets):
```
VITE_API_BASE_URL=https://your-backend.example.com/api
```

**.env.example** (checked in, template for contributors):
```
VITE_API_BASE_URL=http://localhost:8000/api
```

`api/client.js` and `api/auth.js` both read `import.meta.env.VITE_API_BASE_URL`.
Vite's dev proxy is also configured to forward `/api` → `http://localhost:8000` as a fallback, but the full URL is used directly so CORS headers are required (see below).

---

## Django Backend

### Models (`core/models.py`)

**AppUser** — extends `AbstractUser`
- `role`: `creator` | `admin`
- `profile_picture`: optional ImageField

**Link**
- `url`, `title`, `description`, `link_day` (DateTimeField)
- `category`: `featured` | `regular`
- `disabled_at`: nullable
- `user`: FK → AppUser
- `created_at`, `updated_at`: auto

**Collection**
- `name`, `category`: `public` | `private`
- `user`: FK → AppUser
- `links`: M2M → Link

### Serializers (`core/serializers.py`)

| Serializer | Used for |
|---|---|
| `RegisterSerializer` | POST /api/auth/register/ |
| `SocialCompleteSerializer` | POST /api/auth/social/complete/ |
| `AppUserSerializer` | User CRUD (admin) |
| `LinkSerializer` | All link responses — `user` is **read-only** |
| `LinkCreateSerializer` | POST /api/links/, POST /api/collections/:id/add_link/ |
| `CollectionSerializer` | All collection responses — `user` is **read-only** |
| `CollectionSummarySerializer` | GET /api/users/collections/summary |
| `LinkWithCollectionsSerializer` | GET /api/users/recent_collection_links — includes nested collections |

> **Important:** `user` is `read_only` in both `LinkSerializer` and `CollectionSerializer`. The frontend never sends `user` in PUT request bodies — ownership is always inferred from `request.user`.

### API Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/token/` | None | Login — returns `{access, refresh}` |
| POST | `/api/auth/token/refresh/` | None | Refresh access token |
| POST | `/api/auth/register/` | None | Register — returns `{access, refresh}` |
| GET | `/api/auth/username/check/?username=` | None | Username availability check |
| POST | `/api/auth/social/<provider>/` | None | Social auth (Google/Microsoft) |
| POST | `/api/auth/social/complete/` | None | Finish social signup with chosen username |
| GET/POST | `/api/links/` | JWT | List owned links / create link |
| GET/PUT/DELETE | `/api/links/:id/` | JWT | Retrieve, update, delete link |
| GET | `/api/users/links?username=` | JWT | All links for a user |
| GET | `/api/users/links/by_day?username=&date=` | JWT | Links for a specific date |
| GET | `/api/users/links/by_month?username=&month=&year=` | JWT | Links grouped by date for a month |
| GET | `/api/users/stats?username=` | JWT | Total links, featured count, top collection |
| GET | `/api/users/featured_links?username=` | JWT | Featured links only |
| GET | `/api/users/recent_collection_links?username=` | JWT | 5 most recent links in any collection |
| GET | `/api/users/profile?username=` | JWT | Public profile (featured + public collections) |
| GET | `/api/users/collections/summary?username=` | JWT | Collection list with link counts |
| GET/POST | `/api/collections/` | JWT | List collections / create collection |
| GET/PUT/DELETE | `/api/collections/:id/` | JWT | Retrieve, update, delete collection |
| POST | `/api/collections/:id/add_link/` | JWT | Create a link and add it to a collection |

### CORS (`artlinks/settings.py`)

`django-cors-headers` is installed and configured:
```python
INSTALLED_APPS = [..., 'corsheaders']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', ...]  # must be first
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

For production, add the deployed frontend URL to `CORS_ALLOWED_ORIGINS`.

---

## Frontend

### Provider Mount Order (`main.jsx`)

```jsx
<StrictMode>
  <BrowserRouter>
    <AuthProvider>        ← must be inside BrowserRouter (calls useNavigate)
      <TweaksProvider>
        <App />
      </TweaksProvider>
    </AuthProvider>
  </BrowserRouter>
</StrictMode>
```

### Routes (`App.jsx`)

| Path | Component | Auth |
|---|---|---|
| `/` | `LandingPage` | Public — redirects to `/dashboard` if logged in |
| `/login` | `LoginPage` | Public |
| `/signup` | `SignupPage` | Public |
| `/dashboard` | `DashboardPage` | Private |
| `/collections` | `CollectionsPage` | Private |
| `/featured` | `FeaturedPage` | Private |
| `/daily` | `DailyPage` | Private |
| `/:username` | `PublicProfilePage` | Public |

`PrivateRoute` renders `null` while auth is loading, redirects to `/login` if unauthenticated, otherwise renders `<Outlet />`.

### API Layer (`src/api/`)

**`client.js`** — axios instance with:
- `baseURL: import.meta.env.VITE_API_BASE_URL`
- Request interceptor: attach `Bearer <token>` from `localStorage.artlinks:access`
- Response interceptor: on 401, attempt silent token refresh using `artlinks:refresh`; queue concurrent 401 requests; dispatch `artlinks:logout` DOM event if refresh fails

**`auth.js`** — uses plain `axios` (not `client`) so no auth token is sent:
- `login(username, password)` → POST `/auth/token/`
- `register(email, username, password, passwordConfirm)` → POST `/auth/register/`
- `checkUsername(username)` → GET `/auth/username/check/`
- `refreshToken(refresh)` → POST `/auth/token/refresh/`
- `socialAuth(provider, tokenPayload)` → POST `/auth/social/:provider/`
- `socialComplete(pendingToken, username)` → POST `/auth/social/complete/`

**`links.js`** — all calls use `client`:
- `createLink(data)`, `updateLink(id, data)`, `deleteLink(id)`
- `getUserLinks(username)`, `getUserLinksByDay(username, date)`, `getUserLinksByMonth(username, month, year)`
- `getUserStats(username)`, `getUserFeaturedLinks(username)`, `getUserRecentCollectionLinks(username)`

**`collections.js`** — all calls use `client`:
- `getCollections()`, `createCollection(data)`, `updateCollection(id, data)`, `deleteCollection(id)`
- `addLinkToCollection(collectionId, linkData)` — creates the link AND adds it to the collection in one call
- `getUserCollectionsSummary(username)`, `getUserProfile(username)`

### Contexts

**`AuthContext`**
- Rehydrates `user` from `localStorage.artlinks:user` on mount
- `login(username, password)` → calls API, decodes JWT payload for `user_id`, persists tokens + `{id, username}`, navigates to `/dashboard`
- `register(email, username, password, passwordConfirm)` → same pattern as login
- `logout()` → clears localStorage, navigates to `/login`
- Listens for `artlinks:logout` DOM event (fired by `client.js` interceptor on failed refresh)
- Exposes `{ user, isAuthenticated, isLoading, login, register, logout }`

**`TweaksContext`**
- Theme only: light / dark
- Sets `document.body.dataset.theme` on change
- Persists to `localStorage.artlinks:theme`
- Exposes `{ theme, toggleTheme }`
- No TweaksPanel UI — `variant`, `density`, `accent` are fixed as static `data-` attributes on `<body>` in `index.html`

### Data Model Translation

The API response shapes differ from the prototype's seed data:

| Prototype field | API field | Notes |
|---|---|---|
| `link.featured` (bool) | `link.category === 'featured'` | Use `isFeatured(link)` helper |
| `link.date` | `link.link_day?.slice(0, 10)` | ISO datetime → date string, use `linkDate(link)` |
| `link.collection` (single ID) | No `collections` field on `LinkSerializer` | Use `linkCollection(link, collections)` — searches `c.links.includes(link.id)` |
| `collection.public` (bool) | `collection.category === 'public'` | Use `isPublicCollection(col)` helper |
| `collection.emoji` | None — deterministic | `COLLECTION_EMOJIS[id % 12]`, use `collectionEmoji(id)` |
| `link.clicks` | Not in API | Removed from UI |

All helpers live in `src/utils/models.js`.

### Creating a Link with a Collection

Two-step logic handled in `useLinks.addLink`:
- If `collectionId` is present → `POST /api/collections/:id/add_link/` (creates link and adds it in one request)
- If no collection → `POST /api/links/`

When editing a link (PUT), `collectionId` is never sent — collection membership is managed separately through the collection detail view.

### Hooks

**`useLinks(username)`**
- Fetches `getUserLinks(username)` on mount
- `toggleFeatured`: optimistic update → PUT with new category → rollback on server 400 (max 8 limit)
- Returns `{ links, loading, error, addLink, updateLink, deleteLink, toggleFeatured, refetch }`

**`useCollections()`**
- Fetches `getCollections()` on mount
- Returns `{ collections, loading, error, addCollection, updateCollection, deleteCollection }`

**`useToast()`**
- `showToast(msg)` sets message, auto-clears after 1800ms
- Returns `{ toast, showToast }`

### Landing Page (`LandingPage.jsx` + `landing.css`)

The landing page is a faithful React port of `artlinks design/index.html`. All visual design, SVG line art, and CSS are preserved exactly. The vanilla-JS interactions are replaced with React state:

- "Log in" / "Sign up" nav buttons open inline modals (`modal` state: `null | 'login' | 'signup'`)
- Login modal: username + password form → calls `useAuth().login()` → navigates to `/dashboard`
- Signup modal: email + username + password + confirm → calls `useAuth().register()` → navigates to `/dashboard`
- Debounced username availability check (400ms) in signup modal hits `/api/auth/username/check/`
- Switch links between modals work (`Log in ↔ Sign up`)
- Escape key and backdrop click close modals; body scroll is locked while open
- Creator search filters a static list and navigates to `/:username` via React Router
- Social auth buttons (Google, Microsoft) show "coming soon" — requires OAuth client IDs to be configured
- If the user is already authenticated, `LandingPage` redirects immediately to `/dashboard`

---

## Known Issues Fixed During Implementation

| Issue | Fix |
|---|---|
| `npm create vite@latest` failed (non-empty directory) | Manually created `package.json` and ran `npm install` |
| React Rules of Hooks violation in `CollectionsPage` | `useState('')` was called inside `if (selectedColId !== null)`. Fixed by hoisting `detailSearch` state to component top level |
| PUT `/api/links/:id/` failed validation | `user` was not in `read_only_fields` in `LinkSerializer`. DRF required it in every PUT body. Fixed by adding `'user'` to `read_only_fields` |
| Same issue for `CollectionSerializer` | Added `read_only_fields = ['user']` |
| Registration/login returned "Registration failed." (generic) | No CORS headers on Django responses. The browser silently blocked cross-origin requests from `localhost:5173` → `localhost:8000`, so `err.response` was `undefined`. Fixed by installing `django-cors-headers` and configuring `CORS_ALLOWED_ORIGINS` |

---

## Local Development Setup

```bash
# 1. Backend
cd artlinks
venv/Scripts/activate           # Windows; use source venv/bin/activate on Mac/Linux
python manage.py migrate
python manage.py runserver      # runs on :8000

# 2. Frontend (separate terminal)
cd artlinks/frontend
npm install                     # first time only
npm run dev                     # runs on :5173
```

Visit `http://localhost:5173` → landing page → Sign up → Dashboard.

API docs available at `http://localhost:8000/api/docs/`.

---

## Deployment Checklist

- [ ] Set `VITE_API_BASE_URL` to the production API URL in `.env.production`
- [ ] Add production frontend origin to `CORS_ALLOWED_ORIGINS` in Django settings
- [ ] Set `DEBUG = False` and a secure `SECRET_KEY` via environment variable
- [ ] Configure `ALLOWED_HOSTS` with the production domain
- [ ] Run `npm run build` in `frontend/` — output is `frontend/dist/`
- [ ] Configure database via `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` env vars (falls back to SQLite if unset)
- [ ] Set up media file serving (`MEDIA_ROOT`) for profile pictures

### Deployment Options

**Option A: Single server — Django serves the React build**
```python
# urls.py — catch-all serves React's index.html
from django.views.generic import TemplateView
urlpatterns += [re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html'))]
```
Point `STATICFILES_DIRS` to `frontend/dist/assets/` and `TEMPLATES[0]['DIRS']` to `frontend/dist/`.

**Option B: Separate deployment**
- React `dist/` → Vercel, Netlify, or Cloudflare Pages
- Django → Render, Railway, or Fly.io
- Update `CORS_ALLOWED_ORIGINS` with the live frontend URL
