# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Artlinks** is a Django 5.1.2 web application (Python 3.12). The project is in early development — a fresh `django-admin startproject` scaffold with no custom apps built yet.

## Setup

The virtual environment exists at `venv/` but dependencies may not be installed. Activate and install before doing anything:

```bash
# Windows
venv\Scripts\activate

# Install dependencies (no requirements.txt yet — install manually)
pip install django==5.1.2
```

## Common Commands

```bash
python manage.py runserver          # Start dev server
python manage.py migrate            # Apply migrations
python manage.py makemigrations     # Generate new migrations
python manage.py createsuperuser    # Create admin user
python manage.py shell              # Django interactive shell
python manage.py test               # Run tests
python manage.py startapp <name>    # Scaffold a new app
```

## Architecture

```
artlinks/
├── artlinks/        # Project config package (settings, root URLs, WSGI/ASGI)
├── manage.py        # Django management CLI entry point
└── db.sqlite3       # SQLite database (dev only)
```

- **No custom apps exist yet.** `INSTALLED_APPS` contains only Django built-ins (admin, auth, contenttypes, sessions, messages, staticfiles).
- **Root URL config** (`artlinks/urls.py`) only has `/admin/` defined — add app URLs here as features are built.
- **Database**: SQLite in development. Migrations haven't been run yet on the empty `db.sqlite3`.
- **Settings**: `artlinks/settings.py` uses hardcoded `SECRET_KEY` and `DEBUG=True`. Environment-based config (e.g., `python-decouple`) should be introduced before any production use.
- **Static files**: `STATIC_URL = 'static/'` defined but no `STATICFILES_DIRS` or production `STATIC_ROOT` configured yet.