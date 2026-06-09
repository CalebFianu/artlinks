import axios from 'axios';
import client from './client';

const BASE = import.meta.env.VITE_API_BASE_URL;

// Plain axios calls — no auth token needed for these endpoints
export const login = (username, password) =>
  axios.post(`${BASE}/auth/token/`, { username, password });

export const register = (email, username, password, passwordConfirm, bio = '') =>
  axios.post(`${BASE}/auth/register/`, {
    email,
    username,
    password,
    password_confirm: passwordConfirm,
    bio,
  });

export const checkUsername = (username) =>
  axios.get(`${BASE}/auth/username/check/?username=${encodeURIComponent(username)}`);

export const refreshToken = (refresh) =>
  axios.post(`${BASE}/auth/token/refresh/`, { refresh });

// Social sign-in shelved — uncomment when OAuth client IDs are configured
// export const socialAuth = (provider, tokenPayload) =>
//   axios.post(`${BASE}/auth/social/${provider}/`, tokenPayload);

// export const socialComplete = (pendingToken, username) =>
//   axios.post(`${BASE}/auth/social/complete/`, {
//     pending_token: pendingToken,
//     username,
//   });

export const requestPasswordReset = (email) =>
  axios.post(`${BASE}/auth/password-reset/`, { email });

export const confirmPasswordReset = (uid, token, password, passwordConfirm) =>
  axios.post(`${BASE}/auth/password-reset/confirm/`, {
    uid,
    token,
    password,
    password_confirm: passwordConfirm,
  });

export const searchUsers = (q) =>
  axios.get(`${BASE}/users/search?q=${encodeURIComponent(q)}`);

// Authenticated calls
export const getMe = (userId) =>
  client.get(`/users/${userId}/`);

export const uploadAvatar = (userId, file) => {
  const form = new FormData();
  form.append('image', file);
  return client.post(`/users/${userId}/avatar/`, form, {
    headers: { 'Content-Type': undefined },
  });
};

export const updateProfile = (data) =>
  client.patch('/users/update_profile/', data);

export const disableAccount = () =>
  client.post('/users/disable_account/');

export const reEnableAccount = () =>
  client.post('/users/re_enable_account/');
