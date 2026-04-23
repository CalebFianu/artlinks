from django.db.models import Q
from rest_framework.viewsets import ModelViewSet

from .models import AppUser, Collection, Link
from .permissions import AppUserPermission, CollectionPermission, LinkPermission
from .serializers import AppUserSerializer, CollectionSerializer, LinkSerializer


class AppUserViewSet(ModelViewSet):
    serializer_class = AppUserSerializer
    permission_classes = [AppUserPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role == AppUser.Role.ADMIN:
            return AppUser.objects.all().order_by('id')
        return AppUser.objects.filter(pk=user.pk)


class LinkViewSet(ModelViewSet):
    serializer_class = LinkSerializer
    permission_classes = [LinkPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role == AppUser.Role.ADMIN:
            return Link.objects.all().order_by('-created_at')
        return Link.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        # Non-admins can only create links for themselves
        if self.request.user.role != AppUser.Role.ADMIN:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class CollectionViewSet(ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [CollectionPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role == AppUser.Role.ADMIN:
            return Collection.objects.all().order_by('id')
        # Own collections (any category) + other users' public collections
        return Collection.objects.filter(
            Q(user=user) | Q(category=Collection.Category.PUBLIC)
        ).distinct().order_by('id')

    def perform_create(self, serializer):
        # Non-admins can only create collections for themselves
        if self.request.user.role != AppUser.Role.ADMIN:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
