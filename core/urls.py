from rest_framework.routers import DefaultRouter

from .views import AppUserViewSet, CollectionViewSet, LinkViewSet

router = DefaultRouter()
router.register('users', AppUserViewSet, basename='appuser')
router.register('links', LinkViewSet, basename='link')
router.register('collections', CollectionViewSet, basename='collection')

urlpatterns = router.urls
