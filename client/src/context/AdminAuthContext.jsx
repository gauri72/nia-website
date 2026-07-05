import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import adminApi, { ADMIN_TOKEN_KEY } from '../services/adminApi';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await adminApi.get('/admin-auth/me');
      setAdmin(data);
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  async function login(email, password) {
    const { data } = await adminApi.post('/admin-auth/login', { email, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    setAdmin(data.admin);
    return data.admin;
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, setAdmin, loading, login, logout, refresh: loadMe }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
