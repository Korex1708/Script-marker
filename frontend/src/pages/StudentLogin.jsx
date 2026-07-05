import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../StudentAuthContext';

export default function StudentLogin() {
  const { login } = useStudentAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(email.trim(), password); navigate('/student/results'); } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">SM</span>
          <div><div className="auth-name">Sentra Merit</div><div className="auth-sub-brand">Student view</div></div>
        </div>
        <h1>Log in</h1>
        <p className="auth-desc">See your marked results once your teacher's reviewed them.</p>
        <form onSubmit={onSubmit}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus required /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p className="auth-footer">New here? <Link to="/student/register">Create an account</Link></p>
        <p className="auth-footer">Are you a teacher? <Link to="/login">Log in here</Link></p>
      </div>
    </div>
  );
}
