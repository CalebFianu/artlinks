import re

from rest_framework import serializers

from .models import AppUser, Collection, Link

_USERNAME_RE = re.compile(r'^[a-z0-9-]+$')


def _validate_username_format(value: str) -> str:
    if not _USERNAME_RE.match(value):
        raise serializers.ValidationError(
            'Username may only contain lowercase letters, numbers, and hyphens.'
        )
    if len(value) < 3:
        raise serializers.ValidationError('Username must be at least 3 characters.')
    return value


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        value = value.lower()
        _validate_username_format(value)
        if AppUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if AppUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
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
        if AppUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value


class AppUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = AppUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile_picture', 'password']

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
    class Meta:
        model = Link
        fields = [
            'id', 'url', 'title', 'description', 'link_day',
            'category', 'disabled_at', 'created_at', 'updated_at', 'user',
        ]
        read_only_fields = ['created_at', 'updated_at', 'user']


class LinkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ['url', 'title', 'description', 'link_day', 'category']


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ['id', 'name', 'emoji', 'category', 'user', 'links']
        read_only_fields = ['user']


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
