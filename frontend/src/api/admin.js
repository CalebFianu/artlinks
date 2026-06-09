import client from './client';

export const getAdminUsers = (page = 1, search = '') => {
  const params = new URLSearchParams({ page });
  if (search) params.set('search', search);
  return client.get(`/admin/users/?${params}`);
};

export const adminDisableUser = (id) =>
  client.post(`/admin/users/${id}/disable/`);

export const adminEnableUser = (id) =>
  client.post(`/admin/users/${id}/enable/`);
