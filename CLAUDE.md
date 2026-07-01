# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Artlinks** is a link-in-bio / public portfolio platform for creators. Users create an account, add links, organise them into collections, connect social media profiles, and share a public profile page at `/:username`.

- **Backend**: Django 5.1.2 + Django REST Framework (Python 3.12), JWT auth via `simplejwt`
- **Frontend**: React 18 + Vite 6, single-page app with React Router
- **Database**: SQLite in dev, PostgreSQL in production (Railway)
- **Media/avatars**: Cloudinary
- **Email**: Mailjet SMTP (password reset flow)

## Setup

```bash
# Activate the virtual environment (Windows)
venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install

# Run backend dev server
python manage.py runserver

# Run frontend dev server (separate terminal)
cd frontend && npm run dev
```

## Common Commands

```bash
python manage.py runserver          # Start Django dev server (port 8000)
python manage.py migrate            # Apply migrations
python manage.py makemigrations     # Generate new migrations
python manage.py createsuperuser    # Create admin user
python manage.py shell              # Django interactive shell
python manage.py test               # Run tests
```

## Architecture

```
artlinks/
├── artlinks/           # Project config (settings.py, urls.py, wsgi.py)
├── core/               # Main Django app — all models, views, serializers
│   ├── models.py       # AppUser, Link, Collection, SocialLink
│   ├── views.py        # All API views and ViewSets
│   ├── serializers.py  # All serializers
│   ├── urls.py         # API URL routes (included at /api/)
│   ├── throttles.py    # Custom throttle classes
│   └── tests.py        # Test suite
├── frontend/
│   └── src/
│       ├── App.jsx             # Router and route definitions
│       ├── styles.css          # Global styles + dark mode variables
│       ├── api/                # Axios API modules (client, auth, links, collections, socials, admin)
│       ├── components/         # Reusable UI components
│       ├── hooks/              # useLinks, useCollections, useToast
│       ├── context/            # AuthContext, TweaksContext
│       └── pages/              # One file per page/route
├── requirements.txt
├── manage.py
├── Procfile                    # For Railway deployment (gunicorn + migrate)
└── deploy.md                   # Deployment checklist (Railway + Vercel)
```

## Models

| Model | Key Fields |
|---|---|
| `AppUser` | Extends `AbstractUser`. Fields: `role` (admin/creator/guest), `profile_picture` (URL), `bio`, `disabled_at`, `admin_disabled_at` |
| `Link` | `url`, `title`, `description`, `link_day`, `category` (featured/regular), `order`, `disabled_at`. FK → AppUser |
| `Collection` | `name`, `emoji`, `category` (public/private). FK → AppUser. M2M → Link |
| `SocialLink` | `platform` (12 platforms), `url`. FK → AppUser. Unique on (user, platform) |

## API Endpoints

All routes are prefixed `/api/`.

**Auth**
- `POST /auth/token/` — login
- `POST /auth/token/refresh/` — refresh JWT
- `POST /auth/register/` — register
- `POST /auth/social/<provider>/` — Google/Microsoft social auth
- `POST /auth/social/complete/` — finalise social signup (set username)
- `GET  /auth/username/check/` — username availability
- `POST /auth/password-reset/` — request reset email
- `POST /auth/password-reset/confirm/` — confirm reset

**Users** (`/users/`)
- `GET  users/profile/` — public profile (featured links, public collections, socials)
- `GET  users/links/` — paginated links for a user
- `GET  users/links/by_month/` — links filtered by month/year
- `GET  users/links/by_day/` — links for a specific date
- `GET  users/collections/summary/` — collections with link counts
- `GET  users/stats/` — total links, featured count, top collection
- `GET  users/recent_collection_links/` — 5 most recent collection links
- `GET  users/featured_links/` — paginated featured links
- `POST users/<id>/avatar/` — upload profile picture
- `PATCH users/update_profile/` — update bio
- `POST users/disable_account/` — self-disable
- `POST users/re_enable_account/` — re-enable

**Links** (`/links/`) — Full CRUD + `POST /links/reorder/`

**Collections** (`/collections/`) — Full CRUD + `POST /collections/<id>/add_link/`

**Social Links** (`/social-links/`) — Full CRUD

**Admin**
- `GET  /platform-stats/` — public stats (creator/link/collection counts)
- `GET  /admin/users/` — paginated user list with counts
- `POST /admin/users/<id>/disable/` — suspend user
- `POST /admin/users/<id>/enable/` — reinstate user

## Frontend Pages

| Route | Page | Notes |
|---|---|---|
| `/` | `LandingPage` | Public landing, login/signup |
| `/dashboard` | `DashboardPage` | Main hub |
| `/collections` | `CollectionsPage` | Manage collections |
| `/featured` | `FeaturedPage` | Manage featured links |
| `/daily` | `DailyPage` | Calendar/date-based link view |
| `/socials` | `SocialsPage` | Manage social links |
| `/account` | `AccountPage` | Profile settings |
| `/admin` | `AdminPage` | Admin user management |
| `/forgot-password` | `ForgotPasswordPage` | Request reset |
| `/reset-password` | `ResetPasswordPage` | Confirm reset |
| `/:username` | `PublicProfilePage` | Public shareable profile |

## Key Patterns

- **Auth**: JWT stored in `AuthContext`. Axios interceptor in `api/client.js` attaches the token and handles refresh.
- **Protected routes**: `<PrivateRoute>` and `<AdminRoute>` wrap pages in `App.jsx`.
- **Data fetching**: `useLinks(username)` and `useCollections()` are the two main hooks. After adding a link to a collection, call `refetchCollections()` to refresh link counts.
- **LinkModal**: `defaultCollectionId` prop locks to a collection and hides the picker. `onCreateCollection` prop shows a "Create one" shortcut when no collections exist.
- **Serializers**: `CollectionSerializer` returns link PKs (internal use). `PublicCollectionSerializer` returns full nested link objects (public profile endpoint).
- **Rate limiting**: Custom throttle classes in `core/throttles.py` — login (10/hr), register (5/hr), password reset (5/hr), avatar upload (10/hr).
- **Profanity filtering**: Applied on usernames, bios, and link titles via `better-profanity`.

## Environment Variables

Set in `.env` (dev) or host dashboard (production):

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` in dev, `False` in prod |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL (falls back to SQLite if unset) |
| `CLOUDINARY_URL` | Avatar uploads |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` | SMTP relay for password reset emails |
| `DEFAULT_FROM_EMAIL` | Sender address |
| `EMAIL_BACKEND` | Set to `django.core.mail.backends.smtp.EmailBackend` in prod |
| `FRONTEND_URL` | Used in password reset email links |

## Deployment

See `deploy.md` for the full checklist. Target stack: **Railway** (Django + PostgreSQL, ~$5/month) + **Vercel** (React frontend, free).

Still needed before deploying:
- `gunicorn`, `whitenoise`, `psycopg2-binary` added to `requirements.txt`
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` driven from env vars in `settings.py`
- `STATIC_ROOT` + whitenoise middleware configured
- Frontend API base URL driven from `VITE_API_URL` env var