import datetime

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AppUser, Collection, Link


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
        ids = [l['id'] for l in response.data]
        self.assertIn(self.creator_link.id, ids)
        self.assertIn(self.other_link.id, ids)

    def test_creator_sees_only_own_links(self):
        self._auth(self.creator)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data]
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
        ids = [c['id'] for c in response.data]
        self.assertIn(self.owner_public.id, ids)
        self.assertIn(self.owner_private.id, ids)
        self.assertIn(self.other_public.id, ids)
        self.assertIn(self.other_private.id, ids)

    def test_owner_sees_own_and_others_public_collections(self):
        self._auth(self.owner)
        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c['id'] for c in response.data]
        # Own collections (both public and private) are visible
        self.assertIn(self.owner_public.id, ids)
        self.assertIn(self.owner_private.id, ids)
        # Other user's public collection is visible
        self.assertIn(self.other_public.id, ids)
        # Other user's private collection is NOT visible
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
        ids = [l['id'] for l in response.data]
        self.assertIn(self.link1.id, ids)
        self.assertIn(self.link2.id, ids)
        self.assertNotIn(self.other_link.id, ids)

    def test_creator_can_fetch_own_links(self):
        self._auth(self.creator)
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [l['id'] for l in response.data]
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

    def test_links_grouped_by_day(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('2026-05-01', response.data)
        self.assertIn('2026-05-03', response.data)
        self.assertEqual(len(response.data['2026-05-01']), 1)
        self.assertEqual(len(response.data['2026-05-03']), 2)

    def test_links_from_other_months_excluded(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 5, 2026))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        all_ids = [l['id'] for day_links in response.data.values() for l in day_links]
        self.assertNotIn(self.june_link.id, all_ids)

    def test_empty_month_returns_empty_dict(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator', 1, 2025))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {})

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

    def test_creator_cannot_fetch_other_profile(self):
        self._auth(self.creator)
        response = self.client.get(self._url('other'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self._url('creator'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


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
        col_data = next(c for c in response.data if c['id'] == self.col.id)
        self.assertEqual(col_data['total_link_count'], 2)

    def test_featured_link_count_correct(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        col_data = next(c for c in response.data if c['id'] == self.col.id)
        self.assertEqual(col_data['featured_link_count'], 1)

    def test_empty_collection_has_zero_counts(self):
        self._auth(self.admin)
        response = self.client.get(self._url('creator'))
        empty_data = next(c for c in response.data if c['id'] == self.empty_col.id)
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
        ids = [l['id'] for l in response.data]
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
        self.assertEqual(response.data, [])

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
