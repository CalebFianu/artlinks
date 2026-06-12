from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminDisableUserView,
    AdminEnableUserView,
    AdminUserListView,
    AppUserViewSet,
    CollectionViewSet,
    LinkViewSet,
    PlatformStatsView,
    SocialLinkViewSet,
)

router = DefaultRouter()
router.register('users', AppUserViewSet, basename='appuser')
router.register('links', LinkViewSet, basename='link')
router.register('collections', CollectionViewSet, basename='collection')
router.register('social-links', SocialLinkViewSet, basename='sociallink')

urlpatterns = router.urls + [
    path('platform-stats/', PlatformStatsView.as_view(), name='platform-stats'),
    # Admin user management
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/disable/', AdminDisableUserView.as_view(), name='admin-user-disable'),
    path('admin/users/<int:pk>/enable/', AdminEnableUserView.as_view(), name='admin-user-enable'),
]
