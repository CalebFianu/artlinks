# Changelog

## 2026-05-04

- Added `title` field (`CharField`, max length 255) to the `Link` model
- Added migration `0004_link_title` for the `title` field
- Added `LinkCreateSerializer` with fields `url`, `title`, `description`, `link_day`, `category` — used exclusively for write operations so that `user` and `disabled_at` are never exposed as request body fields
- `LinkViewSet` now uses `LinkCreateSerializer` for input validation on create and returns the full `LinkSerializer` representation in the response
- `user` on a new link is always derived from the authenticated request user; it can no longer be supplied in the request body
- Added `is_admin` property to `AppUser` (true when `is_superuser` or `role == ADMIN`)
- Added `profile_picture` (`URLField`, nullable) to `AppUser`
- Removed `image` field from `Link`; added migration `0003_move_image_to_appuser` covering both changes
- Added `CollectionSummarySerializer` with annotated `total_link_count` and `featured_link_count` fields
- Added `LinkWithCollectionsSerializer` with a `collections` field filtered to a target user
- Added `UserScopedReadPermission` — grants access only when the requesting user matches the `username` query parameter (admins are exempt)
- Added the following user-scoped read endpoints to `AppUserViewSet`:
  - `GET /api/users/links/?username=` — all links for a user
  - `GET /api/users/links/by_month/?username=&month=&year=` — links grouped by day for a given month
  - `GET /api/users/links/by_day/?username=&date=` — links for a specific date
  - `GET /api/users/featured_links/?username=` — featured links only
  - `GET /api/users/profile/?username=` — featured links and public collections
  - `GET /api/users/collections/summary/?username=` — collections with link counts
  - `GET /api/users/stats/?username=` — total links, featured count, and top collection
  - `GET /api/users/recent_collection_links/?username=` — up to 5 most recently added collection links
- Enforced a cap of 8 featured links per user on `POST /api/links/` and `POST /api/collections/{id}/add_link/`
- Redesigned `POST /api/collections/{id}/add_link/` to accept a link creation payload (`url`, `title`, `description`, `link_day`, `category`) instead of a `link_id`; the new link is created and added to the collection in a single request
- Added `@extend_schema` annotations so Swagger correctly reflects `LinkCreateSerializer` as the request body and `CollectionSerializer` as the response for `add_link`
- Replaced direct `role` comparisons across views and permissions with the `is_admin` property
- Expanded test suite to cover all new endpoints, the featured link cap, and the redesigned `add_link` behaviour

---

## 2026-04-23

- Scaffolded the `core` app with `AppUser`, `Link`, and `Collection` models
- `AppUser` extends `AbstractUser` with a `role` field (`admin`, `creator`, `guest`, defaulting to `guest`)
- `Link` model includes `url`, `image`, `description`, `link_day`, `category` (`featured`/`regular`), `disabled_at`, `created_at`, `updated_at`, and a FK to `AppUser`
- `Collection` model includes `name`, `category` (`public`/`private`), a FK to `AppUser`, and a M2M to `Link`
- Added `AppUserSerializer`, `LinkSerializer`, and `CollectionSerializer`
- Added `AppUserPermission` — admins have full access; creators and guests can only read/update/delete their own account; list and create are admin-only
- Added `LinkPermission` — authenticated users have full CRUD on their own links; admins have full access to all links
- Added `CollectionPermission` — owners have full CRUD on their own collections; non-owners have read-only access to public collections; private collections from other users are inaccessible
- Registered `AppUserViewSet`, `LinkViewSet`, and `CollectionViewSet` with a `DefaultRouter` under `/api/`
- Configured JWT authentication via `rest_framework_simplejwt`
- Added `POST /api/collections/{id}/add_link/` action — accepts a `link_id` and adds the referenced link to the collection (non-admins may only add their own links)
- Added migrations `0001_initial` and `0002_alter_link_image`
- Added full test coverage for `AppUserViewSet`, `LinkViewSet`, `CollectionViewSet`, and the `add_link` action

---

## 2026-04-15

- Initialised the remote repository and performed the initial local merge with `main`

---

## 2026-04-08

- Created the Django 5.1.2 project scaffold (`artlinks/` config package, `manage.py`, `db.sqlite3`)
