import re

import requests
from django.conf import settings

_GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
_MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me'


def verify_google_token(id_token: str) -> dict:
    """
    Verify a Google ID token via Google's tokeninfo endpoint.

    Returns a dict with keys: email, name, provider_id.
    Raises ValueError on invalid or expired token.
    """
    try:
        resp = requests.get(
            _GOOGLE_TOKENINFO_URL,
            params={'id_token': id_token},
            timeout=5,
        )
    except requests.RequestException as exc:
        raise ValueError(f'Could not reach Google: {exc}') from exc

    if resp.status_code != 200:
        raise ValueError('Invalid or expired Google token.')

    data = resp.json()
    if 'error' in data:
        raise ValueError(f"Google token error: {data['error']}")

    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
    if client_id and data.get('aud') != client_id:
        raise ValueError('Google token audience mismatch.')

    return {
        'email': data.get('email', ''),
        'name': data.get('name', ''),
        'provider_id': data.get('sub', ''),
    }


def verify_microsoft_token(access_token: str) -> dict:
    """
    Verify a Microsoft access token by calling MS Graph /me.

    Returns a dict with keys: email, name, provider_id.
    Raises ValueError on invalid or expired token.
    """
    try:
        resp = requests.get(
            _MICROSOFT_GRAPH_URL,
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=5,
        )
    except requests.RequestException as exc:
        raise ValueError(f'Could not reach Microsoft: {exc}') from exc

    if resp.status_code == 401:
        raise ValueError('Invalid or expired Microsoft token.')
    if resp.status_code != 200:
        raise ValueError('Microsoft token verification failed.')

    data = resp.json()
    # userPrincipalName is the fallback when mail is not set (common in personal accounts)
    email = data.get('mail') or data.get('userPrincipalName', '')

    return {
        'email': email,
        'name': data.get('displayName', ''),
        'provider_id': data.get('id', ''),
    }


def suggest_username(name: str, email: str) -> str:
    """
    Derive a valid username slug from the user's display name or email prefix.
    Result is lowercase, alphanumeric + hyphens, max 20 chars.
    """
    base = (name.split()[0] if name.strip() else email.split('@')[0]).lower()
    slug = re.sub(r'[^a-z0-9-]', '', base)[:20]
    return slug or 'user'
