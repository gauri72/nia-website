import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import memberApi, { MEMBER_TOKEN_KEY } from '../services/memberApi';

const MemberAuthContext = createContext(null);

export function MemberAuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem(MEMBER_TOKEN_KEY);
    if (!token) {
      setMember(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await memberApi.get('/member-auth/me');
      setMember(data);
    } catch {
      localStorage.removeItem(MEMBER_TOKEN_KEY);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  async function login(email, password) {
    const { data } = await memberApi.post('/member-auth/login', { email, password });
    localStorage.setItem(MEMBER_TOKEN_KEY, data.token);
    setMember(data.member);
    return data.member;
  }

  function logout() {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    setMember(null);
  }

  return (
    <MemberAuthContext.Provider value={{ member, setMember, loading, login, logout, refresh: loadMe }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  return ctx;
}
