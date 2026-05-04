from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import AppUser, Collection


class UserScopedReadPermission(BasePermission):
    """
    For read-only user-scoped actions resolved by ?username=.
    - Unauthenticated → 401
    - Admin → always allowed
    - Non-admin → only if ?username matches request.user.username
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        requested = request.query_params.get('username')
        return requested == request.user.username


class AppUserPermission(BasePermission):
    """
    - Admin:          full access to all user records.
    - Creator/Guest:  retrieve, update, delete their own account only.
                      list and create are admin-only.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if view.action in ('list', 'create'):
            return request.user.is_admin
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return obj == request.user


class LinkPermission(BasePermission):
    """
    - Admin:          full access to all links.
    - Creator/Guest:  full CRUD on their own links only.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return obj.user == request.user


class CollectionPermission(BasePermission):
    """
    - Admin:          full access to all collections.
    - Owner:          full CRUD on their own collections (public or private).
    - Non-owner:      read-only access to public collections only.
                      private collections from other users are inaccessible.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin:
            return True
        if obj.user == user:
            return True
        if obj.category == Collection.Category.PUBLIC and request.method in SAFE_METHODS:
            return True
        return False
