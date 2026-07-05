import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../StudentAuthContext';

export default function StudentRegister() {
  const { register } = useStudentAuth(); const navigate = useNavigate();
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!joinCode.trim()) return setError("Enter your teacher's join code.");
    setBusy(true);
    try { await register(name.trim(), email.trim(), password, joinCode.trim()); navigate('/student/results'); } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">SM</span>
          <div><div className="auth-name">Sentra Merit</div><div className="auth-sub-brand">Student view</div></div>
        </div>
        <h1>Create account</h1>
        <p className="auth-desc">Enter your name exactly as your teacher has it, plus the join code they shared with you.</p>
        <form onSubmit={onSubmit}>
          <div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} autoFocus required /></div>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <span style={{ fontSize: '.76rem', color: 'var(--ink-faint)' }}>At least 8 characters.</span>
          </div>
          <div className="field"><label>Teacher's join code</label><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. 7F3KQ9" style={{ fontFamily: 'var(--font-m)' }} /></div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/student/login">Log in</Link></p>
      </div>
    </div>
  );
}
