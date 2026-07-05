import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (!token) { setLoading(false); return; }
    api.getMe().then(setTeacher).catch(() => localStorage.removeItem('sm_token')).finally(() => setLoading(false));
  }, []);
  async function login(email, password) { const { token, teacher: t } = await api.login(email, password); localStorage.setItem('sm_token', token); setTeacher(t); }
  async function register(name, email, password) { const { token, teacher: t } = await api.register(name, email, password); localStorage.setItem('sm_token', token); setTeacher(t); }
  function logout() { localStorage.removeItem('sm_token'); setTeacher(null); }
  return <Ctx.Provider value={{ teacher, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
