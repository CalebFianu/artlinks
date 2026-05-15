import client from './client';

// --- CRUD ---
export const getCollections = () => client.get('/collections/');
export const getCollection = (id) => client.get(`/collections/${id}/`);
export const createCollection = (data) => client.post('/collections/', data);
export const updateCollection = (id, data) => client.put(`/collections/${id}/`, data);
export const deleteCollection = (id) => client.delete(`/collections/${id}/`);
export const addLinkToCollection = (collectionId, linkData) =>
  client.post(`/collections/${collectionId}/add_link/`, linkData);

// --- User-scoped ---
export const getUserCollectionsSummary = (username) =>
  client.get(`/users/collections/summary?username=${encodeURIComponent(username)}`);

export const getUserProfile = (username) =>
  client.get(`/users/profile?username=${encodeURIComponent(username)}`);
