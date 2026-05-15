import { useCallback, useEffect, useState } from 'react';
import {
  getCollections,
  createCollection,
  updateCollection as updateCollectionApi,
  deleteCollection as deleteCollectionApi,
} from '../api/collections';

export function useCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getCollections();
      setCollections(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addCollection = async (payload) => {
    const { data: created } = await createCollection(payload);
    setCollections((prev) => [...prev, created]);
    return created;
  };

  const updateCollection = async (id, payload) => {
    const { data: updated } = await updateCollectionApi(id, payload);
    setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCollection = async (id) => {
    await deleteCollectionApi(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
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

  return { collections, loading, error, addCollection, updateCollection, deleteCollection, togglePublic, refetch };
}
