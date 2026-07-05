import { createContext, useContext, useEffect, useState } from 'react';
import { studentApi } from './api';
const Ctx = createContext(null);
export function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('sm_student_token');
    if (!token) { setLoading(false); return; }
    studentApi.getMe().then(setStudent).catch(() => localStorage.removeItem('sm_student_token')).finally(() => setLoading(false));
  }, []);
  async function login(email, password) { const { token, student: s } = await studentApi.login(email, password); localStorage.setItem('sm_student_token', token); setStudent(s); }
  async function register(name, email, password, joinCode) { const { token, student: s } = await studentApi.register(name, email, password, joinCode); localStorage.setItem('sm_student_token', token); setStudent(s); }
  function logout() { localStorage.removeItem('sm_student_token'); setStudent(null); }
  return <Ctx.Provider value={{ student, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
export const useStudentAuth = () => useContext(Ctx);
