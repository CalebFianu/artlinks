import { useCallback, useEffect, useState } from 'react';
import {
  createLink,
  deleteLink as deleteLinkApi,
  updateLink as updateLinkApi,
  getUserLinks,
} from '../api/links';
import { addLinkToCollection } from '../api/collections';

export function useLinks(username) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!username) return;
    try {
      setLoading(true);
      const { data } = await getUserLinks(username);
      setLinks(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Creates link, optionally adding to a collection
  const addLink = async ({ collectionId, ...payload }) => {
    if (collectionId) {
      // add_link creates the link AND adds it to the collection in one call
      await addLinkToCollection(collectionId, payload);
    } else {
      const { data: created } = await createLink(payload);
      setLinks((prev) => [created, ...prev]);
      return created;
    }
    // Refetch to get updated list
    await refetch();
  };

  const updateLink = async (id, payload) => {
    const { data: updated } = await updateLinkApi(id, payload);
    setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  };

  const deleteLink = async (id) => {
    await deleteLinkApi(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  // Toggles featured/regular; handles server 400 for max 8 limit
  const toggleFeatured = async (id) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    const newCategory = link.category === 'featured' ? 'regular' : 'featured';

    // Optimistic update
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, category: newCategory } : l))
    );

    try {
      const { data: updated } = await updateLinkApi(id, {
        url: link.url,
        title: link.title,
        description: link.description,
        link_day: link.link_day,
        category: newCategory,
      });
      setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    } catch (e) {
      // Rollback
      setLinks((prev) => prev.map((l) => (l.id === id ? link : l)));
      throw e;
    }
  };

  return { links, loading, error, addLink, updateLink, deleteLink, toggleFeatured, refetch };
}
