import client from './client';

// --- CRUD ---
export const getLinks = () => client.get('/links/');
export const getLink = (id) => client.get(`/links/${id}/`);
export const createLink = (data) => client.post('/links/', data);
export const updateLink = (id, data) => client.put(`/links/${id}/`, data);
export const deleteLink = (id) => client.delete(`/links/${id}/`);

// --- User-scoped (require ?username= query param) ---
export const getUserLinks = (username) =>
  client.get(`/users/links?username=${encodeURIComponent(username)}`);

export const getUserLinksByDay = (username, date) =>
  client.get(`/users/links/by_day?username=${encodeURIComponent(username)}&date=${date}`);

export const getUserLinksByMonth = (username, month, year) =>
  client.get(
    `/users/links/by_month?username=${encodeURIComponent(username)}&month=${month}&year=${year}`
  );

export const getUserStats = (username) =>
  client.get(`/users/stats?username=${encodeURIComponent(username)}`);

export const getUserFeaturedLinks = (username) =>
  client.get(`/users/featured_links?username=${encodeURIComponent(username)}`);

export const getUserRecentCollectionLinks = (username) =>
  client.get(`/users/recent_collection_links?username=${encodeURIComponent(username)}`);
