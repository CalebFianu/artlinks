from collections import defaultdict
from datetime import date

from django.core import signing
from django.db.models import Count, F, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken

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
    PublicCollectionSerializer,
    RegisterSerializer,
    SocialCompleteSerializer,
)
from .social_auth import verify_google_token, verify_microsoft_token

# Pending social-signup tokens are valid for 10 minutes
_PENDING_TOKEN_MAX_AGE = 600
_PENDING_TOKEN_SALT = 'social-pending'

_SOCIAL_PROVIDERS = {
    'google': ('id_token', verify_google_token),
    'microsoft': ('access_token', verify_microsoft_token),
}


def _tokens_for(user: AppUser) -> dict:
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)


class UsernameCheckView(APIView):
    """
    GET /api/auth/username/check/?username=<value>
    Returns { available: bool, username: str }.
    Used by the signup form for real-time availability feedback.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        import re
        username = request.query_params.get('username', '').lower()
        if not username:
            return Response({'available': False, 'error': 'username is required.'})
        if not re.match(r'^[a-z0-9-]+$', username):
            return Response({'available': False, 'error': 'Invalid characters.'})
        if len(username) < 3:
            return Response({'available': False, 'error': 'Too short (min 3 characters).'})
        available = not AppUser.objects.filter(username=username).exists()
        return Response({'available': available, 'username': username})


class SocialAuthView(APIView):
    """
    POST /api/auth/social/<provider>/
    provider: 'google' | 'microsoft'

    Google:    body { id_token: "<Google ID token>" }
    Microsoft: body { access_token: "<MS access token>" }

    Existing user → returns { access, refresh }.
    New user      → returns { status: "pending", pending_token, email, suggested_username }.
                    The client must call SocialCompleteView to finish registration.
    """
    permission_classes = [AllowAny]

    def post(self, request, provider):
        config = _SOCIAL_PROVIDERS.get(provider)
        if not config:
            return Response(
                {'detail': f'Unsupported provider "{provider}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_field, verify_fn = config
        token = request.data.get(token_field)
        if not token:
            return Response(
                {'detail': f'"{token_field}" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            info = verify_fn(token)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        email = info['email']
        if not email:
            return Response(
                {'detail': 'Provider did not return an email address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = AppUser.objects.get(email=email)
            return Response(_tokens_for(user))
        except AppUser.DoesNotExist:
            pass

        pending_payload = {
            'email': email,
            'provider': provider,
            'provider_id': info['provider_id'],
        }
        pending_token = signing.dumps(pending_payload, salt=_PENDING_TOKEN_SALT)

        return Response({
            'status': 'pending',
            'pending_token': pending_token,
            'email': email,
        })


class SocialCompleteView(APIView):
    """
    POST /api/auth/social/complete/
    Body: { pending_token, username }

    Finalises social registration by creating the AppUser with the chosen username.
    The pending_token is the value returned by SocialAuthView and expires after 10 minutes.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SocialCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pending_token = serializer.validated_data['pending_token']
        username = serializer.validated_data['username']

        try:
            payload = signing.loads(
                pending_token,
                salt=_PENDING_TOKEN_SALT,
                max_age=_PENDING_TOKEN_MAX_AGE,
            )
        except signing.SignatureExpired:
            return Response(
                {'detail': 'This link has expired. Please sign in again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            return Response(
                {'detail': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = payload['email']

        # Guard against a race where the same email signed up between the two calls
        try:
            user = AppUser.objects.get(email=email)
            return Response(_tokens_for(user))
        except AppUser.DoesNotExist:
            pass

        user = AppUser(email=email, username=username, role=AppUser.Role.CREATOR)
        user.set_unusable_password()
        user.save()

        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)

_SCOPED_ACTIONS = {
    'links', 'links_by_month', 'collections_summary',
    'stats', 'recent_collection_links', 'featured_links', 'links_by_day',
}

_PUBLIC_ACTIONS = {'search', 'profile'}

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
        if self.action in _PUBLIC_ACTIONS:
            return [AllowAny()]
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

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        qs = AppUser.objects.filter(username__icontains=q).order_by('username')[:8]
        return Response([{'username': u.username} for u in qs])

    @extend_schema(parameters=[_USERNAME_PARAM])
    @action(detail=False, methods=['get'], url_path='links')
    def links(self, request):
        target_user, err = self._resolve_target_user(request)
        if err:
            return err
        qs = Link.objects.filter(user=target_user).order_by(
            F('order').asc(nulls_last=True), '-created_at'
        )
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
        ).order_by(F('order').asc(nulls_last=True), '-created_at')
        public_cols = Collection.objects.filter(
            user=target_user, category=Collection.Category.PUBLIC,
        ).order_by('id')
        return Response({
            'featured_links': LinkSerializer(featured, many=True).data,
            'public_collections': PublicCollectionSerializer(public_cols, many=True).data,
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
            return Link.objects.all().order_by(F('order').asc(nulls_last=True), '-created_at')
        return Link.objects.filter(user=user).order_by(F('order').asc(nulls_last=True), '-created_at')

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            return Response({'detail': 'ids must be a list of integers.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        owned = set(Link.objects.filter(id__in=ids, user=user).values_list('id', flat=True))
        if len(owned) != len(ids):
            return Response({'detail': 'Invalid link IDs.'}, status=status.HTTP_400_BAD_REQUEST)

        for position, link_id in enumerate(ids):
            Link.objects.filter(id=link_id).update(order=position)

        return Response({'detail': 'Reordered.'})

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
        # Non-admins can only create collections for themselves.
        # Admins may specify a target user via the 'user' field in the request body.
        if not self.request.user.is_admin:
            serializer.save(user=self.request.user)
        else:
            user_pk = self.request.data.get('user')
            if user_pk:
                target_user = AppUser.objects.get(pk=user_pk)
                serializer.save(user=target_user)
            else:
                serializer.save(user=self.request.user)

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
