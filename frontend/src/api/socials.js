import client from './client';

export const getSocialLinks = () => client.get('/social-links/');
export const createSocialLink = (data) => client.post('/social-links/', data);
export const updateSocialLink = (id, data) => client.put(`/social-links/${id}/`, data);
export const deleteSocialLink = (id) => client.delete(`/social-links/${id}/`);
