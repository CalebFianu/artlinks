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
    navigate('/login', { replace: true });
  };

  const login = async (username, password) => {
    const { data } = await authApi.login(username, password);
    const payload = decodeJwtPayload(data.access);
    const userObj = { id: payload.user_id, username };
    persist(data.access, data.refresh, userObj);
    setUser(userObj);
    navigate('/dashboard', { replace: true });
  };

  const register = async (email, username, password, passwordConfirm) => {
    const { data } = await authApi.register(email, username, password, passwordConfirm);
    const payload = decodeJwtPayload(data.access);
    const userObj = { id: payload.user_id, username };
    persist(data.access, data.refresh, userObj);
    setUser(userObj);
    navigate('/dashboard', { replace: true });
  };

  const logout = () => _logout();

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
