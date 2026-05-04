from collections import defaultdict
from datetime import date

from django.db.models import Count, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import AppUser, Collection, Link
from .permissions import (
    AppUserPermission,
    CollectionPermission,
    LinkPermission,
    UserScopedReadPermission,
)
from .serializers import (
    AppUserSerializer,
    CollectionSerializer,
    CollectionSummarySerializer,
    LinkCreateSerializer,
    LinkSerializer,
    LinkWithCollectionsSerializer,
)

_SCOPED_ACTIONS = {
    'links', 'links_by_month', 'profile', 'collections_summary',
    'stats', 'recent_collection_links', 'featured_links', 'links_by_day',
}

_USERNAME_PARAM = OpenApiParameter(
    name='username',
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=True,
    description='Username of the target user.',
)


class AppUserViewSet(ModelViewSet):
    serializer_class = AppUserSerializer

    def get_permissions(self):
        if self.action in _SCOPED_ACTIONS:
            return [UserScopedReadPermission()]
        return [AppUserPermission()]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return AppUser.objects.all().order_by('id')
        return AppUser.objects.filter(pk=user.pk)

    def _resolve_target_user(self, request):
        username = request.query_params.get('username')
        if not username:
            return None, Response(
                {'detail': 'username query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            return AppUser.objects.get(username=username), None
        except AppUser.DoesNotExist:
            return None, Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='links')
    def links(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        qs = Link.objects.filter(user=target_user).order_by('-created_at')
        return Response(LinkSerializer(qs, many=True).data)

    @extend_schema(parameters=[
        _USERNAME_PARAM,
        OpenApiParameter('month', OpenApiTypes.INT, OpenApiParameter.QUERY, required=True, description='Month (1–12).'),
        OpenApiParameter('year', OpenApiTypes.INT, OpenApiParameter.QUERY, required=True, description='4-digit year.'),
    ])
    @action(detail=False, methods=['get'], url_path='links/by_month')
    def links_by_month(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        month_str = request.query_params.get('month')
        year_str = request.query_params.get('year')
        if not month_str or not year_str:
            return Response(
                {'detail': 'month and year are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            month, year = int(month_str), int(year_str)
            if not (1 <= month <= 12):
                raise ValueError
        except ValueError:
            return Response(
                {'detail': 'Invalid month or year.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = Link.objects.filter(
            user=target_user, link_day__year=year, link_day__month=month,
        ).order_by('link_day')
        grouped = defaultdict(list)
        for link in qs:
            grouped[link.link_day.date().isoformat()].append(LinkSerializer(link).data)
        return Response(dict(grouped))

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='profile')
    def profile(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        featured = Link.objects.filter(
            user=target_user, category=Link.Category.FEATURED,
        ).order_by('-created_at')
        public_cols = Collection.objects.filter(
            user=target_user, category=Collection.Category.PUBLIC,
        ).order_by('id')
        return Response({
            'featured_links': LinkSerializer(featured, many=True).data,
            'public_collections': CollectionSerializer(public_cols, many=True).data,
        })

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='collections/summary')
    def collections_summary(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        qs = Collection.objects.filter(user=target_user).annotate(
            total_link_count=Count('links'),
            featured_link_count=Count(
                'links', filter=Q(links__category=Link.Category.FEATURED)
            ),
        ).order_by('id')
        return Response(CollectionSummarySerializer(qs, many=True).data)

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        total_links = Link.objects.filter(user=target_user).count()
        featured_links = Link.objects.filter(
            user=target_user, category=Link.Category.FEATURED,
        ).count()
        top_col = (
            Collection.objects.filter(user=target_user)
            .annotate(link_count=Count('links'))
            .order_by('-link_count')
            .first()
        )
        top_collection = (
            {'name': top_col.name, 'link_count': top_col.link_count}
            if top_col else None
        )
        return Response({
            'total_links': total_links,
            'featured_links': featured_links,
            'top_collection': top_collection,
        })

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='recent_collection_links')
    def recent_collection_links(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        user_col_ids = Collection.objects.filter(user=target_user).values_list('id', flat=True)
        links = (
            Link.objects.filter(collections__in=user_col_ids)
            .distinct()
            .order_by('-created_at')[:5]
        )
        return Response(
            LinkWithCollectionsSerializer(
                links, many=True, context={'target_user': target_user},
            ).data
        )

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='featured_links')
    def featured_links(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        qs = Link.objects.filter(
            user=target_user, category=Link.Category.FEATURED,
        ).order_by('-created_at')
        return Response(LinkSerializer(qs, many=True).data)

    @extend_schema(parameters=[
        _USERNAME_PARAM,
        OpenApiParameter('date', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True, description='Date in YYYY-MM-DD format.'),
    ])
    @action(detail=False, methods=['get'], url_path='links/by_day')
    def links_by_day(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'detail': 'date is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            parsed = date.fromisoformat(date_str)
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = Link.objects.filter(user=target_user, link_day__date=parsed).order_by('link_day')
        return Response(LinkSerializer(qs, many=True).data)


class LinkViewSet(ModelViewSet):
    permission_classes = [LinkPermission]

    def get_serializer_class(self):
        if self.action == 'create':
            return LinkCreateSerializer
        return LinkSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Link.objects.all().order_by('-created_at')
        return Link.objects.filter(user=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        self.perform_create(create_serializer)
        response_serializer = LinkSerializer(
            create_serializer.instance, context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        user = self.request.user

        if serializer.validated_data.get('category') == Link.Category.FEATURED:
            count = Link.objects.filter(
                user=user, category=Link.Category.FEATURED,
            ).count()
            if count >= 8:
                raise DRFValidationError({'category': 'Maximum of 8 featured links allowed.'})

        serializer.save(user=user)


class CollectionViewSet(ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [CollectionPermission]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Collection.objects.all().order_by('id')
        # Own collections (any category) + other users' public collections
        return Collection.objects.filter(
            Q(user=user) | Q(category=Collection.Category.PUBLIC)
        ).distinct().order_by('id')

    def perform_create(self, serializer):
        # Non-admins can only create collections for themselves
        if not self.request.user.is_admin:
            serializer.save(user=self.request.user)
        else:
            serializer.save()

    @extend_schema(request=LinkCreateSerializer, responses=CollectionSerializer)
    @action(detail=True, methods=['post'], url_path='add_link')
    def add_link(self, request, pk=None):
        collection = self.get_object()
        serializer = LinkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if serializer.validated_data.get('category') == Link.Category.FEATURED:
            count = Link.objects.filter(user=user, category=Link.Category.FEATURED).count()
            if count >= 8:
                raise DRFValidationError({'category': 'Maximum of 8 featured links allowed.'})

        link = serializer.save(user=user)
        collection.links.add(link)
        return Response(CollectionSerializer(collection).data, status=status.HTTP_200_OK)
