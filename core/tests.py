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

    def _valid_payload(self, user):
        return {
            'url': 'https://new-link.com',
            'link_day': timezone.now().isoformat(),
            'user': user.pk,
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

    def test_admin_can_create_link_for_any_user(self):
        self._auth(self.admin)
        payload = self._valid_payload(self.creator)
        response = self.client.post(self._list_url(), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.creator.pk)

    def test_creator_create_link_assigned_to_self(self):
        self._auth(self.creator)
        payload = self._valid_payload(self.creator)
        response = self.client.post(self._list_url(), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.creator.pk)

    def test_creator_create_link_forced_to_self_even_with_other_user(self):
        """Non-admin providing another user's ID should still get the link assigned to themselves."""
        self._auth(self.creator)
        payload = self._valid_payload(self.other)  # providing other user's ID
        response = self.client.post(self._list_url(), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.creator.pk)

    def test_unauthenticated_cannot_create_link(self):
        response = self.client.post(self._list_url(), self._valid_payload(self.creator))
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

    Admin       → can add any link to any collection.
    Owner       → can add their own links to their own collections.
    Owner       → cannot add another user's link (403).
    Non-owner   → cannot add a link to a public collection they don't own (403).
    Non-owner   → cannot add a link to a private collection they don't own (404).
    Unauthenticated → blocked (401).
    Missing link_id  → 400.
    Non-existent link_id → 404.
    Duplicate add    → idempotent, still 200.
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

        self.owner_link = make_link(self.owner)
        self.other_link = make_link(self.other, url='https://other.com')

        self.owner_public = make_collection(self.owner, name='Owner Public', category=Collection.Category.PUBLIC)
        self.owner_private = make_collection(self.owner, name='Owner Private', category=Collection.Category.PRIVATE)
        self.other_public = make_collection(self.other, name='Other Public', category=Collection.Category.PUBLIC)
        self.other_private = make_collection(self.other, name='Other Private', category=Collection.Category.PRIVATE)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_access_token(user)}')

    def _url(self, pk):
        return reverse('collection-add-link', args=[pk])

    # --- success ---

    def test_owner_can_add_own_link_to_own_collection(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.owner_link.pk, response.data['links'])

    def test_link_is_persisted_in_database(self):
        self._auth(self.owner)
        self.client.post(self._url(self.owner_public.pk), {'link_id': self.owner_link.pk})
        self.assertIn(self.owner_link, self.owner_public.links.all())

    def test_admin_can_add_any_link_to_any_collection(self):
        self._auth(self.admin)
        response = self.client.post(self._url(self.other_private.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.owner_link.pk, response.data['links'])

    def test_owner_can_add_link_to_own_private_collection(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_private.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.owner_link.pk, response.data['links'])

    def test_adding_link_already_in_collection_is_idempotent(self):
        self.owner_public.links.add(self.owner_link)
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.owner_public.links.filter(pk=self.owner_link.pk).count(), 1)

    # --- bad request ---

    def test_missing_link_id_returns_400(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_link_id_returns_404(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), {'link_id': 99999})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- permission: wrong link owner ---

    def test_owner_cannot_add_other_users_link(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.owner_public.pk), {'link_id': self.other_link.pk})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_users_link_not_added_after_403(self):
        self._auth(self.owner)
        self.client.post(self._url(self.owner_public.pk), {'link_id': self.other_link.pk})
        self.assertNotIn(self.other_link, self.owner_public.links.all())

    # --- permission: wrong collection owner ---

    def test_non_owner_cannot_add_link_to_others_public_collection(self):
        self._auth(self.owner)
        response = self.client.post(self._url(self.other_public.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_add_link_to_others_private_collection(self):
        # get_queryset() excludes other users' private collections, so they resolve to 404
        self._auth(self.owner)
        response = self.client.post(self._url(self.other_private.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- unauthenticated ---

    def test_unauthenticated_cannot_add_link(self):
        response = self.client.post(self._url(self.owner_public.pk), {'link_id': self.owner_link.pk})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
