from django.contrib.auth.models import AbstractUser
from django.db import models


class AppUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        CREATOR = 'creator', 'Creator'
        GUEST = 'guest', 'Guest'

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.GUEST)
    profile_picture = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    disabled_at = models.DateTimeField(null=True, blank=True)
    admin_disabled_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_admin(self):
        return self.is_superuser or self.role == self.Role.ADMIN

    def __str__(self):
        return self.username


class Link(models.Model):
    class Category(models.TextChoices):
        FEATURED = 'featured', 'Featured'
        REGULAR = 'regular', 'Regular'

    url = models.URLField()
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    link_day = models.DateTimeField()
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.REGULAR)
    disabled_at = models.DateTimeField(null=True, blank=True)
    order = models.IntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='links')

    def __str__(self):
        return self.url


class Collection(models.Model):
    class Category(models.TextChoices):
        PUBLIC = 'public', 'Public'
        PRIVATE = 'private', 'Private'

    name = models.CharField(max_length=255)
    emoji = models.CharField(max_length=10, default='✺', blank=True)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.PUBLIC)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='collections')
    links = models.ManyToManyField(Link, related_name='collections', blank=True)

    def __str__(self):
        return self.name


class SocialLink(models.Model):
    class Platform(models.TextChoices):
        TWITTER = 'twitter', 'Twitter'
        FACEBOOK = 'facebook', 'Facebook'
        INSTAGRAM = 'instagram', 'Instagram'
        YOUTUBE = 'youtube', 'YouTube'
        PINTEREST = 'pinterest', 'Pinterest'
        SUBSTACK = 'substack', 'Substack'
        TWITCH = 'twitch', 'Twitch'
        LINKEDIN = 'linkedin', 'LinkedIn'
        TIKTOK = 'tiktok', 'TikTok'
        REDDIT = 'reddit', 'Reddit'
        DISCORD = 'discord', 'Discord'
        WHATSAPP = 'whatsapp', 'WhatsApp'

    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='social_links')
    platform = models.CharField(max_length=20, choices=Platform.choices)
    url = models.URLField()

    class Meta:
        unique_together = ('user', 'platform')

    def __str__(self):
        return f'{self.user.username} — {self.platform}'
