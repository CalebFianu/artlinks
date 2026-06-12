import re

from rest_framework import serializers

from .models import AppUser, Collection, Link, SocialLink
from .validators import check_offensive_content, validate_social_url


class PrefixedURLField(serializers.URLField):
    def to_internal_value(self, value):
        if value and not value.startswith(('http://', 'https://')):
            value = 'https://' + value
        return super().to_internal_value(value)

_USERNAME_RE = re.compile(r'^[a-z0-9-]+$')

RESERVED_USERNAMES = {
    'admin', 'api', 'login', 'logout', 'signup', 'register',
    'dashboard', 'collections', 'featured', 'daily', 'socials',
    'account', 'settings', 'forgot-password', 'reset-password',
    'help', 'support', 'about', 'terms', 'privacy',
    'static', 'media', 'assets',
}


def _validate_username_format(value: str) -> str:
    if not _USERNAME_RE.match(value):
        raise serializers.ValidationError(
            'Username may only contain lowercase letters, numbers, and hyphens.'
        )
    if len(value) < 3:
        raise serializers.ValidationError('Username must be at least 3 characters.')
    if value in RESERVED_USERNAMES:
        raise serializers.ValidationError('This username is reserved.')
    return value


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    bio = serializers.CharField(max_length=500, allow_blank=True, required=False, default='')

    def validate_username(self, value):
        value = value.lower()
        _validate_username_format(value)
        check_offensive_content(value, 'Username')
        if AppUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if AppUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_bio(self, value):
        if value:
            check_offensive_content(value, 'Bio')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = AppUser(role=AppUser.Role.CREATOR, **validated_data)
        user.set_password(password)
        user.save()
        return user


class SocialCompleteSerializer(serializers.Serializer):
    pending_token = serializers.CharField()
    username = serializers.CharField(max_length=150)

    def validate_username(self, value):
        value = value.lower()
        _validate_username_format(value)
        check_offensive_content(value, 'Username')
        if AppUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value


class UpdateProfileSerializer(serializers.Serializer):
    bio = serializers.CharField(max_length=500, allow_blank=True, required=False)

    def validate_bio(self, value):
        if value:
            check_offensive_content(value, 'Bio')
        return value


class AppUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = AppUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile_picture', 'bio', 'disabled_at', 'admin_disabled_at', 'password']

    def validate_bio(self, value):
        if value:
            check_offensive_content(value, 'Bio')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = AppUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LinkSerializer(serializers.ModelSerializer):
    url = PrefixedURLField()

    class Meta:
        model = Link
        fields = [
            'id', 'url', 'title', 'description', 'link_day',
            'category', 'disabled_at', 'order', 'created_at', 'updated_at', 'user',
        ]
        read_only_fields = ['order', 'created_at', 'updated_at', 'user']

    def validate_title(self, value):
        check_offensive_content(value, 'Title')
        return value

    def validate_description(self, value):
        if value:
            check_offensive_content(value, 'Description')
        return value


class LinkCreateSerializer(serializers.ModelSerializer):
    url = PrefixedURLField()

    class Meta:
        model = Link
        fields = ['url', 'title', 'description', 'link_day', 'category']

    def validate_title(self, value):
        check_offensive_content(value, 'Title')
        return value

    def validate_description(self, value):
        if value:
            check_offensive_content(value, 'Description')
        return value


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ['id', 'name', 'emoji', 'category', 'user', 'links']
        read_only_fields = ['user']

    def validate_name(self, value):
        check_offensive_content(value, 'Collection name')
        return value


class PublicCollectionSerializer(serializers.ModelSerializer):
    """Used in the public profile endpoint — links are full objects, not PKs."""
    links = LinkSerializer(many=True, read_only=True)

    class Meta:
        model = Collection
        fields = ['id', 'name', 'emoji', 'category', 'links']


class CollectionSummarySerializer(serializers.ModelSerializer):
    total_link_count = serializers.IntegerField(read_only=True)
    featured_link_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Collection
        fields = ['id', 'name', 'category', 'total_link_count', 'featured_link_count']


class LinkWithCollectionsSerializer(serializers.ModelSerializer):
    collections = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = [
            'id', 'url', 'title', 'description', 'link_day', 'category',
            'disabled_at', 'created_at', 'updated_at', 'user', 'collections',
        ]
        read_only_fields = ['created_at', 'updated_at', 'user']

    def get_collections(self, obj):
        target_user = self.context['target_user']
        qs = obj.collections.filter(user=target_user)
        return CollectionSerializer(qs, many=True).data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data


class SocialLinkSerializer(serializers.ModelSerializer):
    url = PrefixedURLField()

    class Meta:
        model = SocialLink
        fields = ['id', 'platform', 'url']

    def validate(self, data):
        platform = data.get('platform', getattr(self.instance, 'platform', None))
        url = data.get('url', getattr(self.instance, 'url', None))
        if platform and url:
            validate_social_url(platform, url)
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    """Used by the admin dashboard — includes annotated link/collection counts."""
    link_count = serializers.IntegerField(read_only=True)
    collection_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = AppUser
        fields = [
            'id', 'username', 'email', 'date_joined',
            'disabled_at', 'admin_disabled_at',
            'link_count', 'collection_count',
        ]
