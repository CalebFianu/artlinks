from urllib.parse import urlparse

from better_profanity import profanity
from rest_framework import serializers

profanity.load_censor_words()


def check_offensive_content(value: str, field_name: str) -> None:
    if profanity.contains_profanity(value):
        raise serializers.ValidationError(f'{field_name} contains inappropriate content.')


_SOCIAL_DOMAINS = {
    'twitter': ['twitter.com', 'x.com'],
    'facebook': ['facebook.com', 'fb.com', 'fb.me'],
    'instagram': ['instagram.com'],
    'youtube': ['youtube.com', 'youtu.be'],
    'pinterest': ['pinterest.com', 'pin.it'],
    'substack': ['substack.com'],
    'twitch': ['twitch.tv'],
    'linkedin': ['linkedin.com'],
    'tiktok': ['tiktok.com'],
    'reddit': ['reddit.com'],
    'discord': ['discord.gg', 'discord.com'],
    'whatsapp': ['wa.me', 'chat.whatsapp.com', 'api.whatsapp.com'],
}


def validate_social_url(platform: str, url: str) -> None:
    allowed = _SOCIAL_DOMAINS.get(platform)
    if not allowed:
        raise serializers.ValidationError(f'Unsupported platform: {platform}')

    try:
        host = urlparse(url).hostname or ''
    except Exception:
        raise serializers.ValidationError('Invalid URL.')

    host = host.lower()
    if host.startswith('www.'):
        host = host[4:]

    # For substack, allow custom subdomains (e.g. user.substack.com)
    if platform == 'substack':
        if host.endswith('.substack.com') or host == 'substack.com':
            return
        raise serializers.ValidationError(
            'URL must be a substack.com link (e.g. yourname.substack.com).'
        )

    if not any(host == d or host.endswith('.' + d) for d in allowed):
        names = ', '.join(allowed)
        raise serializers.ValidationError(
            f'URL must be from: {names}'
        )
