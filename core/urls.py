from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AppUserViewSet, CollectionViewSet, LinkViewSet, PlatformStatsView

router = DefaultRouter()
router.register('users', AppUserViewSet, basename='appuser')
router.register('links', LinkViewSet, basename='link')
router.register('collections', CollectionViewSet, basename='collection')

urlpatterns = router.urls + [
    path('platform-stats/', PlatformStatsView.as_view(), name='platform-stats'),
]
