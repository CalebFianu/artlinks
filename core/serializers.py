from rest_framework import serializers

from .models import AppUser, Collection, Link


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
        read_only_fields = ['created_at', 'updated_at']


class LinkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ['url', 'title', 'description', 'link_day', 'category']


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ['id', 'name', 'category', 'user', 'links']


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
        read_only_fields = ['created_at', 'updated_at']

    def get_collections(self, obj):
        target_user = self.context['target_user']
        qs = obj.collections.filter(user=target_user)
        return CollectionSerializer(qs, many=True).data
