import { useCallback, useEffect, useState } from 'react';
import {
  getCollections,
  createCollection,
  updateCollection as updateCollectionApi,
  deleteCollection as deleteCollectionApi,
} from '../api/collections';

export function useCollections() {
  const [collections, setCollections] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getCollections(page);
      setCollections(data.results);
      setTotalCount(data.count);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => p - 1);

  const addCollection = async (payload) => {
    const { data: created } = await createCollection(payload);
    // Go to last page or refetch so the new collection is visible
    if (page !== 1) {
      setPage(1);
    } else {
      await refetch();
    }
    return created;
  };

  const updateCollection = async (id, payload) => {
    const { data: updated } = await updateCollectionApi(id, payload);
    setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCollection = async (id) => {
    await deleteCollectionApi(id);
    // If we just deleted the last item on a non-first page, step back
    const remaining = collections.length - 1;
    if (remaining === 0 && page > 1) {
      setPage((p) => p - 1); // triggers refetch via useEffect
    } else {
      setCollections((prev) => prev.filter((c) => c.id !== id));
      setTotalCount((c) => c - 1);
    }
  };

  // Toggle public/private
  const togglePublic = async (id) => {
    const col = collections.find((c) => c.id === id);
    if (!col) return;
    const newCategory = col.category === 'public' ? 'private' : 'public';
    return updateCollection(id, {
      name: col.name,
      category: newCategory,
      user: col.user,
      links: col.links,
    });
  };

  return {
    collections, loading, error,
    page, nextPage, prevPage, totalCount, hasNext, hasPrev,
    addCollection, updateCollection, deleteCollection, togglePublic, refetch,
  };
}
