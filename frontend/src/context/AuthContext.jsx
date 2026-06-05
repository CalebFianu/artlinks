import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

function persist(access, refresh, userObj) {
  localStorage.setItem('artlinks:access', access);
  localStorage.setItem('artlinks:refresh', refresh);
  localStorage.setItem('artlinks:user', JSON.stringify(userObj));
}

function clear() {
  localStorage.removeItem('artlinks:access');
  localStorage.removeItem('artlinks:refresh');
  localStorage.removeItem('artlinks:user');
}

// Fetch user fields not present in the JWT after we have a valid token in localStorage
async function fetchUserData(userId) {
  try {
    const { data } = await authApi.getMe(userId);
    return {
      profile_picture: data.profile_picture || null,
      disabled_at: data.disabled_at || null,
      bio: data.bio || '',
    };
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('artlinks:user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clear();
      }
    }
    setIsLoading(false);

    const handleForceLogout = () => _logout();
    window.addEventListener('artlinks:logout', handleForceLogout);
    return () => window.removeEventListener('artlinks:logout', handleForceLogout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _logout = () => {
    clear();
    setUser(null);
    navigate('/', { replace: true });
  };

  const login = async (username, password) => {
    const { data } = await authApi.login(username, password);
    const payload = decodeJwtPayload(data.access);
    const userObj = { id: payload.user_id, username };
    // Persist tokens first so getMe can attach them via the axios interceptor
    persist(data.access, data.refresh, userObj);
    Object.assign(userObj, await fetchUserData(payload.user_id));
    persist(data.access, data.refresh, userObj);
    setUser(userObj);
    navigate('/dashboard', { replace: true });
  };

  const register = async (email, username, password, passwordConfirm, bio = '', avatarFile = null) => {
    const { data } = await authApi.register(email, username, password, passwordConfirm, bio);
    const payload = decodeJwtPayload(data.access);
    const userObj = { id: payload.user_id, username };
    // Persist tokens first so the axios client can attach them to subsequent requests
    persist(data.access, data.refresh, userObj);
    if (avatarFile) {
      try {
        const { data: avatarData } = await authApi.uploadAvatar(payload.user_id, avatarFile);
        userObj.profile_picture = avatarData.profile_picture;
      } catch {
        // best-effort; user can update photo later
      }
    }
    if (!userObj.profile_picture) {
      Object.assign(userObj, await fetchUserData(payload.user_id));
    }
    persist(data.access, data.refresh, userObj);
    setUser(userObj);
    navigate('/dashboard', { replace: true });
  };

  const logout = () => _logout();

  const uploadAvatar = async (file) => {
    const { data } = await authApi.uploadAvatar(user.id, file);
    const updatedUser = { ...user, profile_picture: data.profile_picture };
    const access = localStorage.getItem('artlinks:access');
    const refresh = localStorage.getItem('artlinks:refresh');
    persist(access, refresh, updatedUser);
    setUser(updatedUser);
    return data.profile_picture;
  };

  const updateProfile = async (fields) => {
    const { data } = await authApi.updateProfile(fields);
    const updatedUser = { ...user, ...data };
    const access = localStorage.getItem('artlinks:access');
    const refresh = localStorage.getItem('artlinks:refresh');
    persist(access, refresh, updatedUser);
    setUser(updatedUser);
  };

  const disableAccount = async () => {
    await authApi.disableAccount();
    _logout();
  };

  const reEnableAccount = async () => {
    await authApi.reEnableAccount();
    const updatedUser = { ...user, disabled_at: null };
    const access = localStorage.getItem('artlinks:access');
    const refresh = localStorage.getItem('artlinks:refresh');
    persist(access, refresh, updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, uploadAvatar, updateProfile, disableAccount, reEnableAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
