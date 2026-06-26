import datetime

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AppUser, Collection, Link, SocialLink


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_access_token(user):
    return str(RefreshToken.for_user(user).access_token)


def make_link(user, **kwargs):
    defaults = {
        'url': 'https://example.com',
        'title': 'Example Link',
        'link_day': timezone.now(),
    }
    defaults.update(kwargs)
    return Link.objects.create(user=user, **defaults)


def make_collection(user, **kwargs):
    defaults = {
        'name': 'My Collection',
        'category': Collection.Category.PUBLIC,
    }
    defaults.update(kwargs)
    return Collection.objects.create(user=user, **defaults)


# ---------------------------------------------------------------------------
# AppUserViewSet
# ---------------------------------------------------------------------------

class AppUserViewSetTests(APITestCase):
    """
    Admin  → full CRUD on all users.
    Creator/Guest → retrieve/update/delete own account only; list and create blocked.
    Unauthenticated → blocked on every action.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass123', role=AppUser.Role.CREATOR,
        )
        self.guest = AppUser.objects.create_user(
            username='guest', password='pass123', role=AppUser.Role.GUEST,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _list_url(self):
        return reverse('appuser-list')

    def _detail_url(self, pk):
        return reverse('appuser-detail', args=[pk])

    # --- list ---

    def test_admin_can_list_all_users(self):
        self._auth(self.admin)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [u['id'] for u in response.data]
        self.assertIn(self.creator.id, ids)
        self.assertIn(self.guest.id, ids)

    def test_creator_cannot_list_users(self):
        self._auth(self.creator)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_guest_cannot_list_users(self):
        self._auth(self.guest)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- create ---

    def test_admin_can_create_user(self):
        self._auth(self.admin)
        data = {'username': 'newuser', 'password': 'strongpass123', 'role': AppUser.Role.GUEST}
        response = self.client.post(self._list_url(), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'newuser')

    def test_create_hashes_password(self):
        self._auth(self.admin)
        data = {'username': 'hashme', 'password': 'plaintext99', 'role': AppUser.Role.GUEST}
        self.client.post(self._list_url(), data)
        user = AppUser.objects.get(username='hashme')
        self.assertTrue(user.check_password('plaintext99'))
        self.assertNotEqual(user.password, 'plaintext99')

    def test_creator_cannot_create_user(self):
        self._auth(self.creator)
        data = {'username': 'newuser', 'password': 'strongpass123', 'role': AppUser.Role.GUEST}
        response = self.client.post(self._list_url(), data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_user(self):
        data = {'username': 'newuser', 'password': 'strongpass123', 'role': AppUser.Role.GUEST}
        response = self.client.post(self._list_url(), data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- retrieve ---

    def test_admin_can_retrieve_any_user(self):
        self._auth(self.admin)
        response = self.client.get(self._detail_url(self.creator.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.creator.id)

    def test_creator_can_retrieve_own_profile(self):
        self._auth(self.creator)
        response = self.client.get(self._detail_url(self.creator.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_retrieve_other_user(self):
        # get_queryset() scopes to own record, so other users resolve to 404
        self._auth(self.creator)
        response = self.client.get(self._detail_url(self.guest.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_retrieve_user(self):
        response = self.client.get(self._detail_url(self.creator.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- update (PATCH) ---

    def test_admin_can_update_any_user(self):
        self._auth(self.admin)
        response = self.client.patch(
            self._detail_url(self.creator.pk), {'first_name': 'Updated'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')

    def test_creator_can_update_own_profile(self):
        self._auth(self.creator)
        response = self.client.patch(
            self._detail_url(self.creator.pk), {'first_name': 'Mine'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_update_other_user(self):
        # get_queryset() scopes to own record, so other users resolve to 404
        self._auth(self.creator)
        response = self.client.patch(
            self._detail_url(self.guest.pk), {'first_name': 'Hacked'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_password_is_hashed(self):
        self._auth(self.creator)
        self.client.patch(self._detail_url(self.creator.pk), {'password': 'newpassword99'})
        self.creator.refresh_from_db()
        self.assertTrue(self.creator.check_password('newpassword99'))

    # --- destroy ---

    def test_admin_can_delete_any_user(self):
        self._auth(self.admin)
        response = self.client.delete(self._detail_url(self.guest.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AppUser.objects.filter(pk=self.guest.pk).exists())

    def test_creator_can_delete_own_account(self):
        self._auth(self.creator)
        response = self.client.delete(self._detail_url(self.creator.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_creator_cannot_delete_other_user(self):
        # get_queryset() scopes to own record, so other users resolve to 404
        self._auth(self.creator)
        response = self.client.delete(self._detail_url(self.guest.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# LinkViewSet
# ---------------------------------------------------------------------------

class LinkViewSetTests(APITestCase):
    """
    Admin  → full CRUD, sees all links.
    Creator/Guest → full CRUD on own links only; other users' links return 403.
    Non-admin create → user field is forced to the authenticated user.
    Unauthenticated → blocked on every action.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass123', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass123', role=AppUser.Role.CREATOR,
        )
        self.creator_link = make_link(self.creator)
        self.other_link = make_link(self.other, url='https://other.com')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _list_url(self):
        return reverse('link-list')

    def _detail_url(self, pk):
        return reverse('link-detail', args=[pk])

    def _valid_payload(self):
        return {
            'url': 'https://new-link.com',
            'title': 'New Link',
            'link_day': timezone.now().isoformat(),
        }

    # --- unauthenticated ---

    def test_unauthenticated_cannot_list_links(self):
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_retrieve_link(self):
        response = self.client.get(self._detail_url(self.creator_link.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- list ---

    def test_admin_sees_all_links(self):
        self._auth(self.admin)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data['results']]
        self.assertIn(self.creator_link.id, ids)
        self.assertIn(self.other_link.id, ids)

    def test_creator_sees_only_own_links(self):
        self._auth(self.creator)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data['results']]
        self.assertIn(self.creator_link.id, ids)
        self.assertNotIn(self.other_link.id, ids)

    # --- create ---

    def test_admin_create_link_assigned_to_admin(self):
        self._auth(self.admin)
        response = self.client.post(self._list_url(), self._valid_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.admin.pk)

    def test_creator_create_link_assigned_to_self(self):
        self._auth(self.creator)
        response = self.client.post(self._list_url(), self._valid_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.creator.pk)

    def test_unauthenticated_cannot_create_link(self):
        response = self.client.post(self._list_url(), self._valid_payload())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- retrieve ---

    def test_admin_can_retrieve_any_link(self):
        self._auth(self.admin)
        response = self.client.get(self._detail_url(self.other_link.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_can_retrieve_own_link(self):
        self._auth(self.creator)
        response = self.client.get(self._detail_url(self.creator_link.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_retrieve_other_users_link(self):
        # get_queryset() scopes to own links, so other users' links resolve to 404
        self._auth(self.creator)
        response = self.client.get(self._detail_url(self.other_link.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- update ---

    def test_admin_can_update_any_link(self):
        self._auth(self.admin)
        response = self.client.patch(
            self._detail_url(self.creator_link.pk),
            {'url': 'https://updated.com'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['url'], 'https://updated.com')

    def test_creator_can_update_own_link(self):
        self._auth(self.creator)
        response = self.client.patch(
            self._detail_url(self.creator_link.pk),
            {'url': 'https://myupdate.com'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_update_other_users_link(self):
        # get_queryset() scopes to own links, so other users' links resolve to 404
        self._auth(self.creator)
        response = self.client.patch(
            self._detail_url(self.other_link.pk),
            {'url': 'https://hack.com'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- destroy ---

    def test_admin_can_delete_any_link(self):
        self._auth(self.admin)
        response = self.client.delete(self._detail_url(self.other_link.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Link.objects.filter(pk=self.other_link.pk).exists())

    def test_creator_can_delete_own_link(self):
        self._auth(self.creator)
        response = self.client.delete(self._detail_url(self.creator_link.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_creator_cannot_delete_other_users_link(self):
        # get_queryset() scopes to own links, so other users' links resolve to 404
        self._auth(self.creator)
        response = self.client.delete(self._detail_url(self.other_link.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# CollectionViewSet
# ---------------------------------------------------------------------------

class CollectionViewSetTests(APITestCase):
    """
    Admin   → full CRUD, sees all collections.
    Owner   → full CRUD on own collections (public or private).
    Non-owner → read-only on public collections; private collections are inaccessible.
    Non-admin create → user field is forced to the authenticated user.
    Unauthenticated → blocked on every action.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.owner = AppUser.objects.create_user(
            username='owner', password='pass123', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass123', role=AppUser.Role.CREATOR,
        )

        self.owner_public = make_collection(self.owner, name='Owner Public', category=Collection.Category.PUBLIC)
        self.owner_private = make_collection(self.owner, name='Owner Private', category=Collection.Category.PRIVATE)
        self.other_public = make_collection(self.other, name='Other Public', category=Collection.Category.PUBLIC)
        self.other_private = make_collection(self.other, name='Other Private', category=Collection.Category.PRIVATE)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _list_url(self):
        return reverse('collection-list')

    def _detail_url(self, pk):
        return reverse('collection-detail', args=[pk])

    def _valid_payload(self, user, name='New Collection'):
        return {'name': name, 'category': Collection.Category.PUBLIC, 'user': user.pk}

    # --- unauthenticated ---

    def test_unauthenticated_cannot_list_collections(self):
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_retrieve_collection(self):
        response = self.client.get(self._detail_url(self.owner_public.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- list ---

    def test_admin_sees_all_collections(self):
        self._auth(self.admin)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.owner_public.id, ids)
        self.assertIn(self.owner_private.id, ids)
        self.assertIn(self.other_public.id, ids)
        self.assertIn(self.other_private.id, ids)

    def test_owner_sees_only_own_collections_in_list(self):
        self._auth(self.owner)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c['id'] for c in response.data['results']]
        # Own collections (both public and private) are visible
        self.assertIn(self.owner_public.id, ids)
        self.assertIn(self.owner_private.id, ids)
        # Other user's collections are NOT in the list (personal Collections page)
        self.assertNotIn(self.other_public.id, ids)
        self.assertNotIn(self.other_private.id, ids)

    # --- create ---

    def test_admin_can_create_collection_for_any_user(self):
        self._auth(self.admin)
        payload = self._valid_payload(self.owner)
        response = self.client.post(self._list_url(), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.owner.pk)

    def test_owner_create_collection_assigned_to_self(self):
        self._auth(self.owner)
        payload = self._valid_payload(self.owner)
        response = self.client.post(self._list_url(), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.owner.pk)

    def test_non_admin_create_forced_to_self_even_with_other_user(self):
        """Non-admin providing another user's ID should still get the collection assigned to themselves."""
        self._auth(self.owner)
        payload = self._valid_payload(self.other)  # providing other user's ID
        response = self.client.post(self._list_url(), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.owner.pk)

    def test_unauthenticated_cannot_create_collection(self):
        response = self.client.post(self._list_url(), self._valid_payload(self.owner))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- retrieve ---

    def test_admin_can_retrieve_any_collection(self):
        self._auth(self.admin)
        for col in [self.owner_public, self.owner_private, self.other_public, self.other_private]:
            with self.subTest(collection=col.name):
                response = self.client.get(self._detail_url(col.pk))
                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_owner_can_retrieve_own_public_collection(self):
        self._auth(self.owner)
        response = self.client.get(self._detail_url(self.owner_public.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_owner_can_retrieve_own_private_collection(self):
        self._auth(self.owner)
        response = self.client.get(self._detail_url(self.owner_private.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_owner_can_retrieve_others_public_collection(self):
        self._auth(self.owner)
        response = self.client.get(self._detail_url(self.other_public.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_owner_cannot_retrieve_others_private_collection(self):
        # get_queryset() excludes other users' private collections, so they resolve to 404
        self._auth(self.owner)
        response = self.client.get(self._detail_url(self.other_private.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- update ---

    def test_admin_can_update_any_collection(self):
        self._auth(self.admin)
        response = self.client.patch(
            self._detail_url(self.other_private.pk), {'name': 'Admin Renamed'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Admin Renamed')

    def test_owner_can_update_own_collection(self):
        self._auth(self.owner)
        response = self.client.patch(
            self._detail_url(self.owner_public.pk), {'name': 'Renamed'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_owner_can_update_own_private_collection(self):
        self._auth(self.owner)
        response = self.client.patch(
            self._detail_url(self.owner_private.pk), {'name': 'Private Renamed'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_owner_cannot_update_others_public_collection(self):
        self._auth(self.owner)
        response = self.client.patch(
            self._detail_url(self.other_public.pk), {'name': 'Hacked'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_update_others_private_collection(self):
        # get_queryset() excludes other users' private collections, so they resolve to 404
        self._auth(self.owner)
        response = self.client.patch(
            self._detail_url(self.other_private.pk), {'name': 'Hacked'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- destroy ---

    def test_admin_can_delete_any_collection(self):
        self._auth(self.admin)
        response = self.client.delete(self._detail_url(self.other_private.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Collection.objects.filter(pk=self.other_private.pk).exists())

    def test_owner_can_delete_own_collection(self):
        self._auth(self.owner)
        response = self.client.delete(self._detail_url(self.owner_public.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_non_owner_cannot_delete_others_public_collection(self):
        self._auth(self.owner)
        response = self.client.delete(self._detail_url(self.other_public.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_delete_others_private_collection(self):
        # get_queryset() excludes other users' private collections, so they resolve to 404
        self._auth(self.owner)
        response = self.client.delete(self._detail_url(self.other_private.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# CollectionViewSet — add_link action
# ---------------------------------------------------------------------------

class CollectionAddLinkTests(APITestCase):
    """
    POST /api/collections/{id}/add_link/

    Accepts a link creation payload and creates + adds the link to the collection.

    Owner       → can create and add a link to their own collections.
    Admin       → can create and add a link to any collection.
    Non-owner   → cannot add a link to a public collection they don't own (403).
    Non-owner   → cannot add a link to a private collection they don't own (404).
    Unauthenticated → blocked (401).
    Invalid payload → 400.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.owner = AppUser.objects.create_user(
            username='owner', password='pass123', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass123', role=AppUser.Role.CREATOR,
        )

        self.owner_public = make_collection(self.owner, name='Owner Public', category=Collection.Category.PUBLIC)
        self.owner_private = make_collection(self.owner, name='Owner Private', category=Collection.Category.PRIVATE)
        self.other_public = make_collection(self.other, name='Other Public', category=Collection.Category.PUBLIC)
        self.other_private = make_collection(self.other, name='Other Private', category=Collection.Category.PRIVATE)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, pk):
        return reverse('collection-add-link', args=[pk])

    def _valid_link_payload(self):
        return {
            'url': 'https://example.com',
            'title': 'Collection Link',
            'link_day': timezone.now().isoformat(),
        }

    # --- success ---

    def test_owner_can_add_link_to_own_collection(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), self._valid_link_payload())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['links']), 1)

    def test_link_is_created_and_added_to_collection(self):
        self._auth(self.owner)
        self.client.post(self._url(self.owner_public.pk), self._valid_link_payload())
        self.assertEqual(self.owner_public.links.count(), 1)

    def test_created_link_assigned_to_requesting_user(self):
        self._auth(self.owner)
        self.client.post(self._url(self.owner_public.pk), self._valid_link_payload())
        link = self.owner_public.links.first()
        self.assertEqual(link.user, self.owner)

    def test_admin_can_add_link_to_any_collection(self):
        self._auth(self.admin)
        response = self.client.post(self._url(self.other_private.pk), self._valid_link_payload())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['links']), 1)

    def test_owner_can_add_link_to_own_private_collection(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_private.pk), self._valid_link_payload())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['links']), 1)

    # --- bad request ---

    def test_invalid_payload_returns_400(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- permission: wrong collection owner ---

    def test_non_owner_cannot_add_link_to_others_public_collection(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.other_public.pk), self._valid_link_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_add_link_to_others_private_collection(self):
        # get_queryset() excludes other users' private collections, so they resolve to 404
        self._auth(self.owner)
        response = self.client.post(self._url(self.other_private.pk), self._valid_link_payload())
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- unauthenticated ---

    def test_unauthenticated_cannot_add_link(self):
        response = self.client.post(self._url(self.owner_public.pk), self._valid_link_payload())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# UserLinksTests — GET /api/users/links/?username=
# ---------------------------------------------------------------------------

class UserLinksTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.link1 = make_link(self.creator)
        self.link2 = make_link(self.creator)
        self.other_link = make_link(self.other)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username=None):
        url = reverse('appuser-links')
        if username:
            url += f'?username={username}'
        return url

    def test_admin_can_fetch_any_users_links(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data['results']]
        self.assertIn(self.link1.id, ids)
        self.assertIn(self.link2.id, ids)
        self.assertNotIn(self.other_link.id, ids)

    def test_creator_can_fetch_own_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data['results']]
        self.assertIn(self.link1.id, ids)

    def test_creator_cannot_fetch_other_users_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_username_returns_403(self):
        self._auth(self.creator)
        response = self.client.get(reverse('appuser-links'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_username_returns_404(self):
        self._auth(self.admin)
        response = self.client.get(self._url('nonexistent'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# UserLinksByMonthTests — GET /api/users/links/by_month/
# ---------------------------------------------------------------------------

class UserLinksByMonthTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.may1 = make_link(
            self.creator,
            link_day=datetime.datetime(2026, 5, 1, 9, 0, tzinfo=datetime.timezone.utc),
        )
        self.may3 = make_link(
            self.creator,
            link_day=datetime.datetime(2026, 5, 3, 14, 0, tzinfo=datetime.timezone.utc),
        )
        self.may3b = make_link(
            self.creator,
            link_day=datetime.datetime(2026, 5, 3, 18, 0, tzinfo=datetime.timezone.utc),
        )
        self.june_link = make_link(
            self.creator,
            link_day=datetime.datetime(2026, 6, 1, 9, 0, tzinfo=datetime.timezone.utc),
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username, month, year):
        return reverse('appuser-links-by-month') + f'?username={username}&month={month}&year={year}'

    def test_returns_paginated_envelope(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_results_are_flat_list_of_links(self):
        # Response is a flat list ordered by link_day; the client groups by date
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertIsInstance(results, list)
        self.assertEqual(len(results), 3)  # may1, may3, may3b
        # link_day is present on every result so the frontend can group by date
        for link in results:
            self.assertIn('link_day', link)

    def test_links_from_other_months_excluded(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = [l['id'] for l in response.data['results']]
        self.assertNotIn(self.june_link.id, result_ids)

    def test_correct_links_included(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 5, 2026))
        result_ids = [l['id'] for l in response.data['results']]
        self.assertIn(self.may1.id, result_ids)
        self.assertIn(self.may3.id, result_ids)
        self.assertIn(self.may3b.id, result_ids)

    def test_empty_month_returns_empty_results(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 1, 2025))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def test_missing_month_returns_400(self):
        self._auth(self.creator)
        url = reverse('appuser-links-by-month') + '?username=creator&year=2026'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_year_returns_400(self):
        self._auth(self.creator)
        url = reverse('appuser-links-by-month') + '?username=creator&month=5'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_month_returns_400(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator', 13, 2026))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_numeric_params_return_400(self):
        self._auth(self.creator)
        url = reverse('appuser-links-by-month') + '?username=creator&month=abc&year=2026'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creator_cannot_fetch_other_users_month(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# UserProfileTests — GET /api/users/profile/?username=
# ---------------------------------------------------------------------------

class UserProfileTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.featured = make_link(self.creator, category=Link.Category.FEATURED)
        self.regular = make_link(self.creator, category=Link.Category.REGULAR)
        self.public_col = make_collection(self.creator, category=Collection.Category.PUBLIC)
        self.private_col = make_collection(self.creator, category=Collection.Category.PRIVATE)
        # Public profile only shows collections that have at least one link
        self.public_col.links.add(self.featured)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username):
        return reverse('appuser-profile') + f'?username={username}'

    def test_response_has_expected_keys(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('featured_links', response.data)
        self.assertIn('public_collections', response.data)
        self.assertIn('bio', response.data)

    def test_bio_returned_in_profile(self):
        self.creator.bio = 'Illustrator and printmaker.'
        self.creator.save(update_fields=['bio'])
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'Illustrator and printmaker.')

    def test_empty_bio_returned_as_empty_string(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.data['bio'], '')

    def test_only_featured_links_returned(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        ids = [l['id'] for l in response.data['featured_links']]
        self.assertIn(self.featured.id, ids)
        self.assertNotIn(self.regular.id, ids)

    def test_only_public_collections_returned(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        ids = [c['id'] for c in response.data['public_collections']]
        self.assertIn(self.public_col.id, ids)
        self.assertNotIn(self.private_col.id, ids)

    def test_creator_can_fetch_own_profile(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_can_fetch_other_profile(self):
        # Public profiles are readable by any authenticated user
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_can_fetch_profile(self):
        # Public profiles are readable without authentication (needed for landing page search)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# UserCollectionsSummaryTests — GET /api/users/collections/summary/?username=
# ---------------------------------------------------------------------------

class UserCollectionsSummaryTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.col = make_collection(self.creator)
        self.empty_col = make_collection(self.creator, name='Empty')
        self.featured = make_link(self.creator, category=Link.Category.FEATURED)
        self.regular = make_link(self.creator, category=Link.Category.REGULAR)
        self.col.links.add(self.featured, self.regular)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username):
        return reverse('appuser-collections-summary') + f'?username={username}'

    def test_total_link_count_correct(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        col_data = next(c for c in response.data['results'] if c['id'] == self.col.id)
        self.assertEqual(col_data['total_link_count'], 2)

    def test_featured_link_count_correct(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        col_data = next(c for c in response.data['results'] if c['id'] == self.col.id)
        self.assertEqual(col_data['featured_link_count'], 1)

    def test_empty_collection_has_zero_counts(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        empty_data = next(c for c in response.data['results'] if c['id'] == self.empty_col.id)
        self.assertEqual(empty_data['total_link_count'], 0)
        self.assertEqual(empty_data['featured_link_count'], 0)

    def test_creator_can_fetch_own_summary(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_fetch_other_summary(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# UserStatsTests — GET /api/users/stats/?username=
# ---------------------------------------------------------------------------

class UserStatsTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.featured1 = make_link(self.creator, category=Link.Category.FEATURED)
        self.featured2 = make_link(self.creator, category=Link.Category.FEATURED)
        self.regular = make_link(self.creator, category=Link.Category.REGULAR)
        self.small_col = make_collection(self.creator, name='Small')
        self.big_col = make_collection(self.creator, name='Big')
        self.small_col.links.add(self.regular)
        self.big_col.links.add(self.featured1, self.featured2, self.regular)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username):
        return reverse('appuser-stats') + f'?username={username}'

    def test_total_links_count(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_links'], 3)

    def test_featured_links_count(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.data['featured_links'], 2)

    def test_top_collection_is_most_linked(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.data['top_collection']['name'], 'Big')
        self.assertEqual(response.data['top_collection']['link_count'], 3)

    def test_top_collection_null_when_no_collections(self):
        no_col_user = AppUser.objects.create_user(
            username='nocol', password='pass', role=AppUser.Role.CREATOR,
        )
        self._auth(self.admin)
        response = self.client.get(self._url('nocol'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['top_collection'])

    def test_creator_can_fetch_own_stats(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_fetch_other_stats(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# RecentCollectionLinksTests — GET /api/users/recent_collection_links/?username=
# ---------------------------------------------------------------------------

class RecentCollectionLinksTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.col = make_collection(self.creator)
        self.other_col = make_collection(self.other)
        # Create 6 links; 5 in the collection, 1 outside
        self.links_in = [make_link(self.creator) for _ in range(5)]
        self.link_outside = make_link(self.creator)
        for link in self.links_in:
            self.col.links.add(link)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username):
        return reverse('appuser-recent-collection-links') + f'?username={username}'

    def test_returns_at_most_five_links(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data), 5)

    def test_link_outside_collections_excluded(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        ids = [l['id'] for l in response.data]
        self.assertNotIn(self.link_outside.id, ids)

    def test_link_in_multiple_collections_appears_once(self):
        shared_link = make_link(self.creator)
        col2 = make_collection(self.creator, name='Col2')
        self.col.links.add(shared_link)
        col2.links.add(shared_link)
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        ids = [l['id'] for l in response.data]
        self.assertEqual(ids.count(shared_link.id), 1)

    def test_collections_field_filtered_to_target_user(self):
        # Add a link to both creator's col and other's col
        shared_link = make_link(self.creator)
        self.col.links.add(shared_link)
        self.other_col.links.add(shared_link)
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        link_data = next((l for l in response.data if l['id'] == shared_link.id), None)
        self.assertIsNotNone(link_data)
        col_ids = [c['id'] for c in link_data['collections']]
        self.assertIn(self.col.id, col_ids)
        self.assertNotIn(self.other_col.id, col_ids)

    def test_empty_when_user_has_no_collection_links(self):
        empty_user = AppUser.objects.create_user(
            username='empty', password='pass', role=AppUser.Role.CREATOR,
        )
        make_collection(empty_user)
        self._auth(self.admin)
        response = self.client.get(self._url('empty'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_creator_can_fetch_own_recent_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_fetch_other_recent_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# UserFeaturedLinksTests — GET /api/users/featured_links/?username=
# ---------------------------------------------------------------------------

class UserFeaturedLinksTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.featured = make_link(self.creator, category=Link.Category.FEATURED)
        self.regular = make_link(self.creator, category=Link.Category.REGULAR)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username):
        return reverse('appuser-featured-links') + f'?username={username}'

    def test_only_featured_links_returned(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data['results']]
        self.assertIn(self.featured.id, ids)
        self.assertNotIn(self.regular.id, ids)

    def test_user_with_no_featured_links_returns_empty_list(self):
        no_featured_user = AppUser.objects.create_user(
            username='plain', password='pass', role=AppUser.Role.CREATOR,
        )
        make_link(no_featured_user, category=Link.Category.REGULAR)
        self._auth(self.admin)
        response = self.client.get(self._url('plain'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], [])

    def test_creator_can_fetch_own_featured_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_fetch_other_featured_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# FeaturedLinkCapTests — POST /api/links/ (max 8 featured)
# ---------------------------------------------------------------------------

class FeaturedLinkCapTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.url = reverse('link-list')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _payload(self, category=Link.Category.FEATURED):
        return {
            'url': 'https://example.com',
            'title': 'Featured Link',
            'link_day': timezone.now().isoformat(),
            'category': category,
        }

    def _fill_featured(self, user, count=8):
        for _ in range(count):
            make_link(user, category=Link.Category.FEATURED)

    def test_eighth_featured_link_is_allowed(self):
        self._fill_featured(self.creator, 7)
        self._auth(self.creator)
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_ninth_featured_link_returns_400(self):
        self._fill_featured(self.creator, 8)
        self._auth(self.creator)
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', response.data)

    def test_regular_link_not_capped_at_eight_featured(self):
        self._fill_featured(self.creator, 8)
        self._auth(self.creator)
        response = self.client.post(self.url, self._payload(category=Link.Category.REGULAR))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_at_cap_cannot_create_featured_link(self):
        self._fill_featured(self.admin, 8)
        self._auth(self.admin)
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', response.data)

    def test_admin_regular_link_not_capped(self):
        self._fill_featured(self.admin, 8)
        self._auth(self.admin)
        response = self.client.post(self.url, self._payload(category=Link.Category.REGULAR))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# UserLinksByDayTests — GET /api/users/links/by_day/?username=&date=
# ---------------------------------------------------------------------------

class UserLinksByDayTests(APITestCase):
    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self.may1_link = make_link(
            self.creator,
            link_day=datetime.datetime(2026, 5, 1, 9, 0, tzinfo=datetime.timezone.utc),
        )
        self.may2_link = make_link(
            self.creator,
            link_day=datetime.datetime(2026, 5, 2, 12, 0, tzinfo=datetime.timezone.utc),
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username, date_str):
        return reverse('appuser-links-by-day') + f'?username={username}&date={date_str}'

    def test_returns_links_matching_date(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', '2026-05-01'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data]
        self.assertIn(self.may1_link.id, ids)
        self.assertNotIn(self.may2_link.id, ids)

    def test_no_links_on_date_returns_empty_list(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', '2026-01-01'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_missing_date_returns_400(self):
        self._auth(self.creator)
        url = reverse('appuser-links-by-day') + '?username=creator'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_date_returns_400(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator', 'not-a-date'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creator_can_fetch_own_links_by_day(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator', '2026-05-01'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_creator_cannot_fetch_other_links_by_day(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other', '2026-05-01'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator', '2026-05-01'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# RegisterViewTests — POST /api/auth/register/
# ---------------------------------------------------------------------------

class RegisterViewTests(APITestCase):
    def _url(self):
        return reverse('register')

    def _payload(self, **overrides):
        base = {
            'email': 'new@example.com',
            'username': 'newuser',
            'password': 'strongpass1',
            'password_confirm': 'strongpass1',
        }
        base.update(overrides)
        return base

    def test_register_without_bio_succeeds(self):
        response = self.client.post(self._url(), self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_register_without_bio_leaves_bio_blank(self):
        self.client.post(self._url(), self._payload())
        user = AppUser.objects.get(username='newuser')
        self.assertEqual(user.bio, '')

    def test_register_with_bio_saves_bio(self):
        response = self.client.post(self._url(), self._payload(bio='Painter and printmaker.'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = AppUser.objects.get(username='newuser')
        self.assertEqual(user.bio, 'Painter and printmaker.')

    def test_register_with_empty_bio_succeeds(self):
        response = self.client.post(self._url(), self._payload(bio=''))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_register_sets_role_to_creator(self):
        self.client.post(self._url(), self._payload())
        user = AppUser.objects.get(username='newuser')
        self.assertEqual(user.role, AppUser.Role.CREATOR)

    def test_register_missing_email_returns_400(self):
        payload = self._payload()
        del payload['email']
        response = self.client.post(self._url(), payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch_returns_400(self):
        response = self.client.post(self._url(), self._payload(password_confirm='different'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username_returns_400(self):
        AppUser.objects.create_user(username='newuser', password='pass')
        response = self.client.post(self._url(), self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email_returns_400(self):
        AppUser.objects.create_user(username='other', email='new@example.com', password='pass')
        response = self.client.post(self._url(), self._payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# OffensiveContentTests — profanity validation across all affected fields
# ---------------------------------------------------------------------------

class OffensiveContentTests(APITestCase):
    """
    Verifies that better-profanity blocks offensive input on every field
    that has a check_offensive_content validator.
    """

    _BAD = 'shit'  # reliably caught by better-profanity's default word list

    def setUp(self):
        self.user = AppUser.objects.create_user(
            username='creator', password='pass123', role=AppUser.Role.CREATOR,
        )

    def _auth(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.user)}'
        )

    # --- register: username ---

    def test_offensive_username_at_register_returns_400(self):
        response = self.client.post(reverse('register'), {
            'email': 'x@example.com',
            'username': self._BAD,
            'password': 'strongpass1',
            'password_confirm': 'strongpass1',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    # --- register: bio ---

    def test_offensive_bio_at_register_returns_400(self):
        response = self.client.post(reverse('register'), {
            'email': 'x@example.com',
            'username': 'cleanname',
            'password': 'strongpass1',
            'password_confirm': 'strongpass1',
            'bio': self._BAD,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bio', response.data)

    # --- username check endpoint ---

    def test_offensive_username_check_returns_unavailable(self):
        url = reverse('username_check') + f'?username={self._BAD}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])
        self.assertIn('error', response.data)

    # --- AppUser PATCH: bio ---

    def test_offensive_bio_on_patch_returns_400(self):
        self._auth()
        url = reverse('appuser-detail', args=[self.user.pk])
        response = self.client.patch(url, {'bio': self._BAD})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bio', response.data)

    def test_clean_bio_on_patch_succeeds(self):
        self._auth()
        url = reverse('appuser-detail', args=[self.user.pk])
        response = self.client.patch(url, {'bio': 'Illustrator based in Berlin.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'Illustrator based in Berlin.')

    # --- Link: title and description ---

    def test_offensive_link_title_returns_400(self):
        self._auth()
        response = self.client.post(reverse('link-list'), {
            'url': 'https://example.com',
            'title': self._BAD,
            'link_day': timezone.now().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_offensive_link_description_returns_400(self):
        self._auth()
        response = self.client.post(reverse('link-list'), {
            'url': 'https://example.com',
            'title': 'Clean title',
            'description': self._BAD,
            'link_day': timezone.now().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    # --- Collection: name ---

    def test_offensive_collection_name_returns_400(self):
        self._auth()
        response = self.client.post(reverse('collection-list'), {
            'name': self._BAD,
            'category': Collection.Category.PUBLIC,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    # --- update_profile: bio ---

    def test_offensive_bio_on_update_profile_returns_400(self):
        self._auth()
        url = reverse('appuser-update-profile')
        response = self.client.patch(url, {'bio': self._BAD})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bio', response.data)

    def test_clean_bio_on_update_profile_succeeds(self):
        self._auth()
        url = reverse('appuser-update-profile')
        response = self.client.patch(url, {'bio': 'Illustrator based in Berlin.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'Illustrator based in Berlin.')


# ---------------------------------------------------------------------------
# UpdateProfileTests — PATCH /api/users/update_profile/
# ---------------------------------------------------------------------------

class UpdateProfileTests(APITestCase):
    """
    Authenticated users can update their own bio via update_profile.
    Unauthenticated requests are blocked.
    """

    def setUp(self):
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self):
        return reverse('appuser-update-profile')

    def test_authenticated_user_can_update_bio(self):
        self._auth(self.creator)
        response = self.client.patch(self._url(), {'bio': 'Hello world'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'Hello world')

    def test_bio_is_saved_to_database(self):
        self._auth(self.creator)
        self.client.patch(self._url(), {'bio': 'Saved bio'})
        self.creator.refresh_from_db()
        self.assertEqual(self.creator.bio, 'Saved bio')

    def test_empty_bio_is_allowed(self):
        self.creator.bio = 'Old bio'
        self.creator.save(update_fields=['bio'])
        self._auth(self.creator)
        response = self.client.patch(self._url(), {'bio': ''})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.creator.refresh_from_db()
        self.assertEqual(self.creator.bio, '')

    def test_update_only_affects_requesting_user(self):
        self._auth(self.creator)
        self.client.patch(self._url(), {'bio': 'Creator bio'})
        self.other.refresh_from_db()
        self.assertEqual(self.other.bio, '')

    def test_unauthenticated_returns_401(self):
        response = self.client.patch(self._url(), {'bio': 'Ghost bio'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# DisableAccountTests — POST /api/users/disable_account/
# ---------------------------------------------------------------------------

class DisableAccountTests(APITestCase):
    """
    POST /api/users/disable_account/ sets disabled_at to the current time.
    Disabled users are excluded from search and their profile returns 404.
    """

    def setUp(self):
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self):
        return reverse('appuser-disable-account')

    def _search_url(self, q):
        return reverse('appuser-search') + f'?q={q}'

    def _profile_url(self, username):
        return reverse('appuser-profile') + f'?username={username}'

    def test_disabled_at_is_null_before_disabling(self):
        self.assertIsNone(self.creator.disabled_at)

    def test_disable_sets_disabled_at_timestamp(self):
        self._auth(self.creator)
        response = self.client.post(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.creator.refresh_from_db()
        self.assertIsNotNone(self.creator.disabled_at)

    def test_disabled_user_excluded_from_search(self):
        self._auth(self.creator)
        self.client.post(self._url())
        self.client.credentials()  # drop auth
        response = self.client.get(self._search_url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data]
        self.assertNotIn('creator', usernames)

    def test_disabled_user_profile_returns_404(self):
        self._auth(self.creator)
        self.client.post(self._url())
        self.client.credentials()
        response = self.client.get(self._profile_url('creator'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_disable(self):
        response = self.client.post(self._url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# ReEnableAccountTests — POST /api/users/re_enable_account/
# ---------------------------------------------------------------------------

class ReEnableAccountTests(APITestCase):
    """
    POST /api/users/re_enable_account/ clears disabled_at.
    Re-enabled users reappear in search and their profile becomes accessible again.
    """

    def setUp(self):
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        # Start with a pre-disabled account
        self.creator.disabled_at = timezone.now()
        self.creator.save(update_fields=['disabled_at'])

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self):
        return reverse('appuser-re-enable-account')

    def _search_url(self, q):
        return reverse('appuser-search') + f'?q={q}'

    def _profile_url(self, username):
        return reverse('appuser-profile') + f'?username={username}'

    def test_re_enable_clears_disabled_at(self):
        self._auth(self.creator)
        response = self.client.post(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.creator.refresh_from_db()
        self.assertIsNone(self.creator.disabled_at)

    def test_re_enable_on_already_active_account_is_harmless(self):
        self.creator.disabled_at = None
        self.creator.save(update_fields=['disabled_at'])
        self._auth(self.creator)
        response = self.client.post(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.creator.refresh_from_db()
        self.assertIsNone(self.creator.disabled_at)

    def test_re_enabled_user_appears_in_search(self):
        self._auth(self.creator)
        self.client.post(self._url())
        self.client.credentials()
        response = self.client.get(self._search_url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data]
        self.assertIn('creator', usernames)

    def test_re_enabled_profile_is_accessible(self):
        self._auth(self.creator)
        self.client.post(self._url())
        self.client.credentials()
        response = self.client.get(self._profile_url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_re_enable(self):
        response = self.client.post(self._url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# UserSearchTests — GET /api/users/search/?q=
# ---------------------------------------------------------------------------

class UserSearchTests(APITestCase):
    """
    Active users appear in search results; disabled users are always excluded.
    """

    def setUp(self):
        self.alice = AppUser.objects.create_user(
            username='alice', password='pass', role=AppUser.Role.CREATOR,
        )
        self.albert = AppUser.objects.create_user(
            username='albert', password='pass', role=AppUser.Role.CREATOR,
        )
        self.disabled = AppUser.objects.create_user(
            username='alicia', password='pass', role=AppUser.Role.CREATOR,
            disabled_at=timezone.now(),
        )

    def _url(self, q):
        return reverse('appuser-search') + f'?q={q}'

    def test_active_users_appear_in_search(self):
        response = self.client.get(self._url('ali'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data]
        self.assertIn('alice', usernames)

    def test_disabled_user_excluded_from_search(self):
        response = self.client.get(self._url('ali'))
        usernames = [u['username'] for u in response.data]
        self.assertNotIn('alicia', usernames)

    def test_multiple_active_matches_all_returned(self):
        response = self.client.get(self._url('al'))
        usernames = [u['username'] for u in response.data]
        self.assertIn('alice', usernames)
        self.assertIn('albert', usernames)

    def test_empty_query_returns_empty_list(self):
        response = self.client.get(self._url(''))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_no_match_returns_empty_list(self):
        response = self.client.get(self._url('zzz'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


# ---------------------------------------------------------------------------
# DisabledProfileAccessTests — GET /api/users/profile/?username=
# ---------------------------------------------------------------------------

class DisabledProfileAccessTests(APITestCase):
    """
    Accessing the profile of a disabled user returns 404 for all callers.
    Active user profiles remain accessible.
    """

    def setUp(self):
        self.active = AppUser.objects.create_user(
            username='active', password='pass', role=AppUser.Role.CREATOR,
        )
        self.disabled = AppUser.objects.create_user(
            username='disabled', password='pass', role=AppUser.Role.CREATOR,
            disabled_at=timezone.now(),
        )
        self.visitor = AppUser.objects.create_user(
            username='visitor', password='pass', role=AppUser.Role.CREATOR,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, username):
        return reverse('appuser-profile') + f'?username={username}'

    def test_active_profile_accessible_unauthenticated(self):
        response = self.client.get(self._url('active'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_active_profile_accessible_authenticated(self):
        self._auth(self.visitor)
        response = self.client.get(self._url('active'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_disabled_profile_returns_404_unauthenticated(self):
        response = self.client.get(self._url('disabled'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_disabled_profile_returns_404_authenticated(self):
        self._auth(self.visitor)
        response = self.client.get(self._url('disabled'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_disabled_profile_returns_404_for_own_account(self):
        # Even the disabled user themselves cannot access their public profile
        self._auth(self.disabled)
        response = self.client.get(self._url('disabled'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# ArtlinksTokenObtainPairView — POST /api/auth/token/
# ---------------------------------------------------------------------------

class LoginViewTests(APITestCase):
    """
    The custom login view wraps simplejwt's TokenObtainPairView to block
    accounts that have been admin-suspended (admin_disabled_at is set).

    Key invariants:
    - Wrong credentials always return 401 regardless of suspension status,
      so callers cannot probe suspension status through error codes.
    - Only admin_disabled_at blocks login; user-initiated disabled_at does not.
    - A suspended user with correct credentials gets 403 with a support-email
      message in `detail`.
    """

    def setUp(self):
        self.active = AppUser.objects.create_user(
            username='active', password='pass123', role=AppUser.Role.CREATOR,
        )
        self.suspended = AppUser.objects.create_user(
            username='suspended', password='pass123', role=AppUser.Role.CREATOR,
            admin_disabled_at=timezone.now(),
        )
        self.self_disabled = AppUser.objects.create_user(
            username='selfdisabled', password='pass123', role=AppUser.Role.CREATOR,
            disabled_at=timezone.now(),
        )

    def _url(self):
        return reverse('token_obtain_pair')

    def test_active_user_can_login(self):
        response = self.client.post(self._url(), {'username': 'active', 'password': 'pass123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_wrong_password_returns_401(self):
        response = self.client.post(self._url(), {'username': 'active', 'password': 'wrong'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_suspended_user_with_correct_credentials_gets_403(self):
        response = self.client.post(self._url(), {'username': 'suspended', 'password': 'pass123'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_suspended_user_403_response_contains_detail(self):
        response = self.client.post(self._url(), {'username': 'suspended', 'password': 'pass123'})
        self.assertIn('detail', response.data)

    def test_suspended_user_403_detail_mentions_support(self):
        response = self.client.post(self._url(), {'username': 'suspended', 'password': 'pass123'})
        self.assertIn('support', response.data['detail'].lower())

    def test_suspended_user_with_wrong_password_gets_401_not_403(self):
        # Wrong credentials must never reveal suspension status
        response = self.client.post(self._url(), {'username': 'suspended', 'password': 'wrongpass'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_self_disabled_user_can_still_login(self):
        # User-initiated disabled_at does NOT block login; only admin_disabled_at does
        response = self.client.post(self._url(), {'username': 'selfdisabled', 'password': 'pass123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_unknown_username_returns_401(self):
        response = self.client.post(self._url(), {'username': 'nobody', 'password': 'pass123'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# AdminUserListView — GET /api/admin/users/
# ---------------------------------------------------------------------------

class AdminUserListViewTests(APITestCase):
    """
    GET /api/admin/users/?page=N

    - Admin receives a paginated list of all users (page size 10).
    - Each result includes link_count and collection_count annotations.
    - Non-admins and unauthenticated callers are rejected.
    - Pagination envelope (count / next / previous / results) is returned.
    - Pagination links only appear when total users exceed 10.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass123', role=AppUser.Role.CREATOR,
        )
        make_link(self.creator)
        make_link(self.creator)
        make_collection(self.creator, name='Col A')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, page=None):
        url = reverse('admin-user-list')
        if page is not None:
            url += f'?page={page}'
        return url

    def test_admin_can_access_user_list(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_response_has_pagination_envelope(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        for key in ('count', 'results'):
            with self.subTest(key=key):
                self.assertIn(key, response.data)

    def test_all_users_appear_in_results(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        ids = [u['id'] for u in response.data['results']]
        self.assertIn(self.admin.id, ids)
        self.assertIn(self.creator.id, ids)

    def test_link_count_annotation_is_correct(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        creator_data = next(u for u in response.data['results'] if u['id'] == self.creator.id)
        self.assertEqual(creator_data['link_count'], 2)

    def test_collection_count_annotation_is_correct(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        creator_data = next(u for u in response.data['results'] if u['id'] == self.creator.id)
        self.assertEqual(creator_data['collection_count'], 1)

    def test_user_with_no_links_or_collections_shows_zero_counts(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        admin_data = next(u for u in response.data['results'] if u['id'] == self.admin.id)
        self.assertEqual(admin_data['link_count'], 0)
        self.assertEqual(admin_data['collection_count'], 0)

    def test_result_includes_expected_fields(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        row = response.data['results'][0]
        for field in ('id', 'username', 'email', 'date_joined', 'disabled_at', 'admin_disabled_at', 'link_count', 'collection_count'):
            with self.subTest(field=field):
                self.assertIn(field, row)

    def test_count_reflects_total_users(self):
        self._auth(self.admin)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], AppUser.objects.count())

    def test_no_pagination_links_when_ten_or_fewer_users(self):
        # setUp creates 2 users; well under 10
        self._auth(self.admin)
        response = self.client.get(self._url())
        self.assertIsNone(response.data.get('next'))
        self.assertIsNone(response.data.get('previous'))

    def test_pagination_splits_results_beyond_ten_users(self):
        # Create 9 more so total is 11 (admin + creator + 9 new)
        for i in range(9):
            AppUser.objects.create_user(username=f'user{i}', password='pass')
        self._auth(self.admin)
        page1 = self.client.get(self._url(page=1))
        self.assertEqual(page1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page1.data['results']), 10)
        self.assertIsNotNone(page1.data.get('next'))

        page2 = self.client.get(self._url(page=2))
        self.assertEqual(page2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page2.data['results']), 1)
        self.assertIsNone(page2.data.get('next'))

    def test_non_admin_creator_gets_403(self):
        self._auth(self.creator)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- search ---

    def test_search_by_username_returns_matching_user(self):
        self._auth(self.admin)
        response = self.client.get(self._url() + '?search=creator')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data['results']]
        self.assertIn('creator', usernames)

    def test_search_by_username_excludes_non_matching_users(self):
        self._auth(self.admin)
        response = self.client.get(self._url() + '?search=creator')
        usernames = [u['username'] for u in response.data['results']]
        self.assertNotIn('admin', usernames)

    def test_search_by_email_returns_matching_user(self):
        self.creator.email = 'artist@example.com'
        self.creator.save(update_fields=['email'])
        self._auth(self.admin)
        response = self.client.get(self._url() + '?search=artist@example')
        usernames = [u['username'] for u in response.data['results']]
        self.assertIn('creator', usernames)

    def test_search_is_case_insensitive(self):
        self._auth(self.admin)
        response = self.client.get(self._url() + '?search=CREATOR')
        usernames = [u['username'] for u in response.data['results']]
        self.assertIn('creator', usernames)

    def test_search_with_no_matches_returns_empty_results(self):
        self._auth(self.admin)
        response = self.client.get(self._url() + '?search=zzznomatch')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], [])
        self.assertEqual(response.data['count'], 0)

    def test_empty_search_returns_all_users(self):
        self._auth(self.admin)
        response = self.client.get(self._url() + '?search=')
        self.assertEqual(response.data['count'], AppUser.objects.count())


# ---------------------------------------------------------------------------
# AdminDisableUserView — POST /api/admin/users/<pk>/disable/
# ---------------------------------------------------------------------------

class AdminDisableUserViewTests(APITestCase):
    """
    POST /api/admin/users/<pk>/disable/

    - Admin can suspend any other user (sets admin_disabled_at).
    - Suspended user cannot log in afterwards.
    - Admin cannot suspend themselves (400).
    - Non-existent PK returns 404.
    - Non-admins and unauthenticated callers are rejected.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass123', role=AppUser.Role.CREATOR,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, pk):
        return reverse('admin-user-disable', args=[pk])

    def test_admin_can_disable_creator(self):
        self._auth(self.admin)
        response = self.client.post(self._url(self.creator.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_disable_sets_admin_disabled_at(self):
        self._auth(self.admin)
        self.client.post(self._url(self.creator.pk))
        self.creator.refresh_from_db()
        self.assertIsNotNone(self.creator.admin_disabled_at)

    def test_disable_does_not_touch_user_disabled_at(self):
        # admin_disabled_at and disabled_at are independent fields
        self._auth(self.admin)
        self.client.post(self._url(self.creator.pk))
        self.creator.refresh_from_db()
        self.assertIsNone(self.creator.disabled_at)

    def test_suspended_user_cannot_login(self):
        self._auth(self.admin)
        self.client.post(self._url(self.creator.pk))
        self.client.credentials()  # drop auth
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'creator', 'password': 'pass123'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_disable_themselves(self):
        self._auth(self.admin)
        response = self.client.post(self._url(self.admin.pk))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disable_self_does_not_set_admin_disabled_at(self):
        self._auth(self.admin)
        self.client.post(self._url(self.admin.pk))
        self.admin.refresh_from_db()
        self.assertIsNone(self.admin.admin_disabled_at)

    def test_nonexistent_user_returns_404(self):
        self._auth(self.admin)
        response = self.client.post(self._url(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_admin_creator_gets_403(self):
        other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )
        self._auth(self.creator)
        response = self.client.post(self._url(other.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        response = self.client.post(self._url(self.creator.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# AdminEnableUserView — POST /api/admin/users/<pk>/enable/
# ---------------------------------------------------------------------------

class AdminEnableUserViewTests(APITestCase):
    """
    POST /api/admin/users/<pk>/enable/

    - Admin can reinstate a suspended user (clears admin_disabled_at).
    - Reinstated user can log in again.
    - Re-enabling an already-active user is a no-op (still 200).
    - Non-existent PK returns 404.
    - Non-admins and unauthenticated callers are rejected.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass123', role=AppUser.Role.ADMIN,
        )
        self.suspended = AppUser.objects.create_user(
            username='suspended', password='pass123', role=AppUser.Role.CREATOR,
            admin_disabled_at=timezone.now(),
        )
        self.active = AppUser.objects.create_user(
            username='active', password='pass123', role=AppUser.Role.CREATOR,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, pk):
        return reverse('admin-user-enable', args=[pk])

    def test_admin_can_enable_suspended_user(self):
        self._auth(self.admin)
        response = self.client.post(self._url(self.suspended.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_enable_clears_admin_disabled_at(self):
        self._auth(self.admin)
        self.client.post(self._url(self.suspended.pk))
        self.suspended.refresh_from_db()
        self.assertIsNone(self.suspended.admin_disabled_at)

    def test_reinstated_user_can_login(self):
        self._auth(self.admin)
        self.client.post(self._url(self.suspended.pk))
        self.client.credentials()  # drop auth
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'suspended', 'password': 'pass123'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_enable_already_active_user_is_harmless(self):
        self._auth(self.admin)
        response = self.client.post(self._url(self.active.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.active.refresh_from_db()
        self.assertIsNone(self.active.admin_disabled_at)

    def test_nonexistent_user_returns_404(self):
        self._auth(self.admin)
        response = self.client.post(self._url(99999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_admin_creator_gets_403(self):
        self._auth(self.active)
        response = self.client.post(self._url(self.suspended.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        response = self.client.post(self._url(self.suspended.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Password Reset Flow
# ---------------------------------------------------------------------------

class PasswordResetRequestTests(APITestCase):
    """
    POST /api/auth/password-reset/
    Sends a reset email when the address is registered; silently succeeds
    when it is not (prevents email enumeration).
    """

    def setUp(self):
        self.user = AppUser.objects.create_user(
            username='resetuser', email='reset@example.com', password='oldpass123',
        )
        self.url = reverse('password_reset')

    def test_registered_email_returns_200_and_sends_email(self):
        response = self.client.post(self.url, {'email': 'reset@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reset@example.com', mail.outbox[0].to)

    def test_email_contains_reset_link_with_uid_and_token(self):
        self.client.post(self.url, {'email': 'reset@example.com'})
        body = mail.outbox[0].body
        self.assertIn('/reset-password', body)
        self.assertIn('uid=', body)
        self.assertIn('token=', body)

    def test_unregistered_email_returns_200_and_sends_no_email(self):
        response = self.client.post(self.url, {'email': 'nobody@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_both_cases_return_identical_message(self):
        r1 = self.client.post(self.url, {'email': 'reset@example.com'})
        r2 = self.client.post(self.url, {'email': 'nobody@example.com'})
        self.assertEqual(r1.data['detail'], r2.data['detail'])

    def test_missing_email_returns_400(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_email_format_returns_400(self):
        response = self.client.post(self.url, {'email': 'not-an-email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmTests(APITestCase):
    """
    POST /api/auth/password-reset/confirm/
    Sets a new password when uid + token are valid; rejects invalid/expired tokens.
    """

    def setUp(self):
        self.user = AppUser.objects.create_user(
            username='confirmuser', email='confirm@example.com', password='oldpass123',
        )
        self.url = reverse('password_reset_confirm')
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = PasswordResetTokenGenerator().make_token(self.user)

    def _post(self, **kwargs):
        payload = {
            'uid': self.uid,
            'token': self.token,
            'password': 'newpass456',
            'password_confirm': 'newpass456',
        }
        payload.update(kwargs)
        return self.client.post(self.url, payload)

    def test_valid_token_resets_password(self):
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass456'))

    def test_can_login_with_new_password_after_reset(self):
        self._post()
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'confirmuser', 'password': 'newpass456'},
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)

    def test_old_password_rejected_after_reset(self):
        self._post()
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'confirmuser', 'password': 'oldpass123'},
        )
        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_invalidated_after_use(self):
        self._post()
        # Using the same token again should fail because the password hash changed
        response = self._post(password='anotherpass789', password_confirm='anotherpass789')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_token_returns_400(self):
        response = self._post(token='completely-wrong-token')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_uid_returns_400(self):
        response = self._post(uid='invaliduid')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_user_uid_returns_400(self):
        uid_for_nobody = urlsafe_base64_encode(force_bytes(99999))
        response = self._post(uid=uid_for_nobody)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_passwords_do_not_match_returns_400(self):
        response = self._post(password='newpass456', password_confirm='different789')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('oldpass123'))  # unchanged

    def test_password_too_short_returns_400(self):
        response = self._post(password='short', password_confirm='short')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('oldpass123'))  # unchanged

    def test_missing_fields_returns_400(self):
        response = self.client.post(self.url, {'uid': self.uid, 'token': self.token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# SocialLinkViewSet — CRUD /api/social-links/
# ---------------------------------------------------------------------------

class SocialLinkViewSetTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.other = AppUser.objects.create_user(
            username='other', password='pass', role=AppUser.Role.CREATOR,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _list_url(self):
        return reverse('sociallink-list')

    def _detail_url(self, pk):
        return reverse('sociallink-detail', args=[pk])

    def test_create_social_link(self):
        self._auth(self.user)
        response = self.client.post(self._list_url(), {
            'platform': 'twitter',
            'url': 'https://x.com/testuser',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['platform'], 'twitter')
        self.assertEqual(response.data['url'], 'https://x.com/testuser')

    def test_create_rejects_wrong_domain(self):
        self._auth(self.user)
        response = self.client.post(self._list_url(), {
            'platform': 'twitter',
            'url': 'https://instagram.com/testuser',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_rejects_duplicate_platform(self):
        self._auth(self.user)
        SocialLink.objects.create(user=self.user, platform='twitter', url='https://x.com/old')
        response = self.client.post(self._list_url(), {
            'platform': 'twitter',
            'url': 'https://x.com/new',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_returns_only_own_links(self):
        SocialLink.objects.create(user=self.user, platform='twitter', url='https://x.com/me')
        SocialLink.objects.create(user=self.other, platform='twitter', url='https://x.com/other')
        self._auth(self.user)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['platform'], 'twitter')

    def test_update_social_link(self):
        self._auth(self.user)
        sl = SocialLink.objects.create(user=self.user, platform='twitter', url='https://x.com/old')
        response = self.client.put(self._detail_url(sl.id), {
            'platform': 'twitter',
            'url': 'https://x.com/new',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sl.refresh_from_db()
        self.assertEqual(sl.url, 'https://x.com/new')

    def test_delete_social_link(self):
        self._auth(self.user)
        sl = SocialLink.objects.create(user=self.user, platform='twitter', url='https://x.com/me')
        response = self.client.delete(self._detail_url(sl.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SocialLink.objects.filter(pk=sl.id).exists())

    def test_cannot_access_others_link(self):
        sl = SocialLink.objects.create(user=self.other, platform='twitter', url='https://x.com/other')
        self._auth(self.user)
        response = self.client.get(self._detail_url(sl.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()  # clear auth
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Social URL validation — per-platform domain checks
# ---------------------------------------------------------------------------

class SocialURLValidationTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.user)}')
        self.url = reverse('sociallink-list')

    def _post(self, platform, link_url):
        return self.client.post(self.url, {'platform': platform, 'url': link_url})

    def test_twitter_accepts_x_com(self):
        r = self._post('twitter', 'https://x.com/handle')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_twitter_accepts_twitter_com(self):
        r = self._post('twitter', 'https://twitter.com/handle')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_twitter_rejects_facebook(self):
        r = self._post('twitter', 'https://facebook.com/handle')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_facebook_accepts_facebook_com(self):
        r = self._post('facebook', 'https://facebook.com/profile')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_instagram_accepts_instagram_com(self):
        r = self._post('instagram', 'https://instagram.com/user')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_instagram_rejects_tiktok(self):
        r = self._post('instagram', 'https://tiktok.com/user')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_youtube_accepts_youtube_com(self):
        r = self._post('youtube', 'https://youtube.com/@channel')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_youtube_accepts_youtu_be(self):
        r = self._post('youtube', 'https://youtu.be/abc123')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_substack_accepts_subdomain(self):
        r = self._post('substack', 'https://myname.substack.com')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_substack_rejects_random_domain(self):
        r = self._post('substack', 'https://example.com/blog')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_twitch_accepts_twitch_tv(self):
        r = self._post('twitch', 'https://twitch.tv/streamer')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_linkedin_accepts_linkedin_com(self):
        r = self._post('linkedin', 'https://linkedin.com/in/user')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_tiktok_accepts_tiktok_com(self):
        r = self._post('tiktok', 'https://tiktok.com/@user')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_reddit_accepts_reddit_com(self):
        r = self._post('reddit', 'https://reddit.com/u/user')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_discord_accepts_discord_gg(self):
        r = self._post('discord', 'https://discord.gg/invite')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_discord_accepts_discord_com(self):
        r = self._post('discord', 'https://discord.com/invite/abc')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_whatsapp_accepts_wa_me(self):
        r = self._post('whatsapp', 'https://wa.me/1234567890')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_whatsapp_accepts_chat_whatsapp(self):
        r = self._post('whatsapp', 'https://chat.whatsapp.com/group')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_pinterest_accepts_pinterest_com(self):
        r = self._post('pinterest', 'https://pinterest.com/user')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_url_without_scheme_gets_prefixed(self):
        r = self._post('twitter', 'x.com/handle')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data['url'].startswith('https://'))


# ---------------------------------------------------------------------------
# Profile endpoint includes social_links
# ---------------------------------------------------------------------------

class ProfileSocialLinksTests(APITestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        SocialLink.objects.create(user=self.user, platform='twitter', url='https://x.com/me')
        SocialLink.objects.create(user=self.user, platform='instagram', url='https://instagram.com/me')

    def _url(self, username):
        return reverse('appuser-profile') + f'?username={username}'

    def test_profile_includes_social_links(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('social_links', response.data)
        self.assertEqual(len(response.data['social_links']), 2)

    def test_profile_social_links_have_expected_fields(self):
        response = self.client.get(self._url('creator'))
        link = response.data['social_links'][0]
        self.assertIn('id', link)
        self.assertIn('platform', link)
        self.assertIn('url', link)

    def test_profile_with_no_social_links_returns_empty_list(self):
        other = AppUser.objects.create_user(
            username='empty', password='pass', role=AppUser.Role.CREATOR,
        )
        response = self.client.get(self._url('empty'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['social_links'], [])


# ---------------------------------------------------------------------------
# Reserved username validation
# ---------------------------------------------------------------------------

class ReservedUsernameTests(APITestCase):
    def _register_url(self):
        return reverse('register')

    def _check_url(self, username):
        return reverse('username_check') + f'?username={username}'

    def _payload(self, username):
        return {
            'email': f'{username}@example.com',
            'username': username,
            'password': 'strongpass1',
            'password_confirm': 'strongpass1',
        }

    def test_register_rejects_reserved_username_admin(self):
        response = self.client.post(self._register_url(), self._payload('admin'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_reserved_username_dashboard(self):
        response = self.client.post(self._register_url(), self._payload('dashboard'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_reserved_username_api(self):
        response = self.client.post(self._register_url(), self._payload('api'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_reserved_username_login(self):
        response = self.client.post(self._register_url(), self._payload('login'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_reserved_username_socials(self):
        response = self.client.post(self._register_url(), self._payload('socials'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_allows_non_reserved_username(self):
        response = self.client.post(self._register_url(), self._payload('coolartist'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_username_check_returns_unavailable_for_reserved(self):
        response = self.client.get(self._check_url('admin'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])
        self.assertIn('reserved', response.data['error'].lower())

    def test_username_check_returns_available_for_valid(self):
        response = self.client.get(self._check_url('coolartist'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['available'])


# ---------------------------------------------------------------------------
# Pagination — GET /api/links/
# ---------------------------------------------------------------------------

class LinkListPaginationTests(APITestCase):
    """
    Verify that GET /api/links/ returns a DRF pagination envelope and that
    results are split into pages of 10.
    """

    def setUp(self):
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.url = reverse('link-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.creator)}')

    def _make_links(self, n):
        for i in range(n):
            make_link(self.creator, title=f'Link {i}')

    def test_response_has_pagination_envelope(self):
        self._make_links(1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_ten_links_no_next_page(self):
        self._make_links(10)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 10)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNone(response.data['next'])

    def test_eleven_links_splits_across_pages(self):
        self._make_links(11)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])

    def test_page_two_returns_remainder(self):
        self._make_links(11)
        response = self.client.get(self.url + '?page=2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIsNone(response.data['next'])


# ---------------------------------------------------------------------------
# Pagination — GET /api/collections/
# ---------------------------------------------------------------------------

class CollectionListPaginationTests(APITestCase):
    """
    Verify that GET /api/collections/ returns a DRF pagination envelope and
    that results are split into pages of 10.
    """

    def setUp(self):
        self.owner = AppUser.objects.create_user(
            username='owner', password='pass', role=AppUser.Role.CREATOR,
        )
        self.url = reverse('collection-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.owner)}')

    def _make_collections(self, n):
        for i in range(n):
            make_collection(self.owner, name=f'Collection {i}')

    def test_response_has_pagination_envelope(self):
        self._make_collections(1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_ten_collections_no_next_page(self):
        self._make_collections(10)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 10)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNone(response.data['next'])

    def test_eleven_collections_splits_across_pages(self):
        self._make_collections(11)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])

    def test_page_two_returns_remainder(self):
        self._make_collections(11)
        response = self.client.get(self.url + '?page=2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIsNone(response.data['next'])


# ---------------------------------------------------------------------------
# Pagination — GET /api/users/links/
# ---------------------------------------------------------------------------

class UserLinksPaginationTests(APITestCase):
    """
    Verify that GET /api/users/links/ returns a DRF pagination envelope and
    that results are split into pages of 10.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.admin)}')

    def _url(self, username='creator', page=None):
        url = reverse('appuser-links') + f'?username={username}'
        if page:
            url += f'&page={page}'
        return url

    def _make_links(self, n):
        for i in range(n):
            make_link(self.creator, title=f'Link {i}')

    def test_response_has_pagination_envelope(self):
        self._make_links(1)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_ten_links_no_next_page(self):
        self._make_links(10)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], 10)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNone(response.data['next'])

    def test_eleven_links_splits_across_pages(self):
        self._make_links(11)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])

    def test_page_two_returns_remainder(self):
        self._make_links(11)
        response = self.client.get(self._url(page=2))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIsNone(response.data['next'])


# ---------------------------------------------------------------------------
# Pagination — GET /api/users/featured_links/
# ---------------------------------------------------------------------------

class UserFeaturedLinksPaginationTests(APITestCase):
    """
    Verify that GET /api/users/featured_links/ returns a DRF pagination
    envelope. In practice featured links are capped at 8 so a second page
    is never reached, but the envelope itself must always be present.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.admin)}')

    def _url(self, username='creator'):
        return reverse('appuser-featured-links') + f'?username={username}'

    def test_response_has_pagination_envelope(self):
        make_link(self.creator, category=Link.Category.FEATURED)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_empty_featured_links_returns_zero_count(self):
        make_link(self.creator, category=Link.Category.REGULAR)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def test_count_matches_number_of_featured_links(self):
        for _ in range(3):
            make_link(self.creator, category=Link.Category.FEATURED)
        make_link(self.creator, category=Link.Category.REGULAR)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 3)


# ---------------------------------------------------------------------------
# Pagination — GET /api/users/collections/summary/
# ---------------------------------------------------------------------------

class UserCollectionsSummaryPaginationTests(APITestCase):
    """
    Verify that GET /api/users/collections/summary/ returns a DRF pagination
    envelope and that results are split into pages of 10.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.admin)}')

    def _url(self, username='creator', page=None):
        url = reverse('appuser-collections-summary') + f'?username={username}'
        if page:
            url += f'&page={page}'
        return url

    def _make_collections(self, n):
        for i in range(n):
            make_collection(self.creator, name=f'Col {i}')

    def test_response_has_pagination_envelope(self):
        self._make_collections(1)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_eleven_collections_splits_across_pages(self):
        self._make_collections(11)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])

    def test_page_two_returns_remainder(self):
        self._make_collections(11)
        response = self.client.get(self._url(page=2))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


# ---------------------------------------------------------------------------
# Pagination — GET /api/users/links/by_month/
# ---------------------------------------------------------------------------

class UserLinksByMonthPaginationTests(APITestCase):
    """
    Verify that GET /api/users/links/by_month/ returns a flat DRF pagination
    envelope (not a grouped dict) and splits correctly across pages of 10.
    """

    def setUp(self):
        self.admin = AppUser.objects.create_user(
            username='admin', password='pass', role=AppUser.Role.ADMIN,
        )
        self.creator = AppUser.objects.create_user(
            username='creator', password='pass', role=AppUser.Role.CREATOR,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(self.admin)}')

    def _url(self, username='creator', month=6, year=2026, page=None):
        url = (
            reverse('appuser-links-by-month')
            + f'?username={username}&month={month}&year={year}'
        )
        if page:
            url += f'&page={page}'
        return url

    def _make_month_links(self, n):
        for i in range(n):
            make_link(
                self.creator,
                title=f'Link {i}',
                link_day=datetime.datetime(2026, 6, 1 + (i % 28), tzinfo=datetime.timezone.utc),
            )

    def test_response_has_pagination_envelope(self):
        self._make_month_links(1)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)

    def test_results_are_flat_list_not_dict(self):
        self._make_month_links(3)
        response = self.client.get(self._url())
        self.assertIsInstance(response.data['results'], list)

    def test_each_result_has_link_day_field(self):
        # The frontend uses link_day to reconstruct the {date: links[]} grouping
        self._make_month_links(3)
        response = self.client.get(self._url())
        for link in response.data['results']:
            self.assertIn('link_day', link)

    def test_ten_links_no_next_page(self):
        self._make_month_links(10)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], 10)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNone(response.data['next'])

    def test_eleven_links_splits_across_pages(self):
        self._make_month_links(11)
        response = self.client.get(self._url())
        self.assertEqual(response.data['count'], 11)
        self.assertEqual(len(response.data['results']), 10)
        self.assertIsNotNone(response.data['next'])

    def test_page_two_returns_remainder(self):
        self._make_month_links(11)
        response = self.client.get(self._url(page=2))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIsNone(response.data['next'])
