import { useCallback, useEffect, useState } from 'react';
import {
  createLink,
  deleteLink as deleteLinkApi,
  updateLink as updateLinkApi,
  getUserLinks,
  reorderLinks as reorderLinksApi,
} from '../api/links';
import { addLinkToCollection } from '../api/collections';

const PAGE_SIZE = 10;

export function useLinks(username) {
  const [links, setLinks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!username) return;
    try {
      setLoading(true);
      const { data } = await getUserLinks(username, page);
      setLinks(data.results);
      setTotalCount(data.count);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [username, page]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => p - 1);

  // Creates a link, optionally adding to a collection, then resets to page 1
  // so the newly created link (ordered by -created_at) is immediately visible.
  const addLink = async ({ collectionId, ...payload }) => {
    if (collectionId) {
      await addLinkToCollection(collectionId, payload);
    } else {
      await createLink(payload);
    }
    if (page !== 1) {
      setPage(1); // triggers refetch via useEffect
    } else {
      await refetch();
    }
  };

  const updateLink = async (id, payload) => {
    const { data: updated } = await updateLinkApi(id, payload);
    setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  };

  const deleteLink = async (id) => {
    await deleteLinkApi(id);
    // If we just deleted the last item on a non-first page, step back
    const remaining = links.length - 1;
    if (remaining === 0 && page > 1) {
      setPage((p) => p - 1); // triggers refetch via useEffect
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setTotalCount((c) => c - 1);
    }
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

  const reorderLinks = async (ids) => {
    // Optimistic: assign order values to the provided IDs, keep everything else, then re-sort
    const posMap = Object.fromEntries(ids.map((id, i) => [id, i]));
    setLinks((prev) => {
      const updated = prev.map((l) =>
        l.id in posMap ? { ...l, order: posMap[l.id] } : l
      );
      return updated.sort((a, b) => {
        const aO = a.order ?? Infinity;
        const bO = b.order ?? Infinity;
        if (aO !== bO) return aO - bO;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    });
    try {
      await reorderLinksApi(ids);
    } catch (e) {
      await refetch();
      throw e;
    }
  };

  return {
    links, loading, error,
    page, nextPage, prevPage, totalCount, hasNext, hasPrev,
    addLink, updateLink, deleteLink, toggleFeatured, reorderLinks, refetch,
  };
}
