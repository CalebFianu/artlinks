# Artlinks

Artlinks is a full-stack web application for curating and sharing collections of links. Users can save links, organize them into collections, highlight their favorites, and share a public profile with others.

---

## Features

### Link Management
- Save links with a title, description, and URL
- Links are tied to a specific date and can be browsed by day or month
- Soft-disable links without deleting them
- Drag-and-drop reordering within any view

### Featured Links
- Pin up to 8 links as "featured" to surface them on your public profile
- Reorder featured links independently

### Collections
- Group links into named collections with an emoji icon
- Set collections as public or private
- Public collections are visible to anyone viewing your profile

### Public Profiles
- Every user gets a public profile at `/:username`
- Displays featured links, public collections, and basic stats
- No account required to view a profile

### Authentication
- Email and password registration and login
- JWT-based session management with automatic token refresh
- Username availability checked in real time during signup

---

## Tech Stack

**Backend** — Django 5.1.2 · Django REST Framework · SimpleJWT · drf-spectacular

**Frontend** — React 18 · React Router 6 · Axios · dnd-kit · Vite

**Database** — SQLite (development) · PostgreSQL (production)

---

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 18+

### 1. Clone the repository

```bash
git clone <repo-url>
cd artlinks
```

### 2. Set up the backend

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# (Optional) Create an admin user
python manage.py createsuperuser
```

### 3. Set up the frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 4. Run the development servers

Open two terminals:

**Terminal 1 — Django backend (port 8000)**
```bash
# from the project root, with venv activated
python manage.py runserver
```

**Terminal 2 — Vite frontend (port 5173)**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Documentation

With the backend running, interactive API docs are available at:

- Swagger UI: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- OpenAPI schema: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

---

## Running Tests

```bash
# from the project root, with venv activated
python manage.py test
```