from django.contrib.auth.models import AbstractUser
from django.db import models


class AppUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        CREATOR = 'creator', 'Creator'
        GUEST = 'guest', 'Guest'

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.GUEST)

    def __str__(self):
        return self.username


class Link(models.Model):
    class Category(models.TextChoices):
        FEATURED = 'featured', 'Featured'
        REGULAR = 'regular', 'Regular'

    url = models.URLField()
    image = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True)
    link_day = models.DateTimeField()
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.REGULAR)
    disabled_at = models.DateTimeField(null=True, blank=True)
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
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.PUBLIC)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='collections')
    links = models.ManyToManyField(Link, related_name='collections', blank=True)

    def __str__(self):
        return self.name
