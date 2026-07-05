import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
const nav = [
  { to: '/', label: 'Dashboard', g: '○' },
  { to: '/mark-schemes', label: 'Mark schemes', g: '§' },
  { to: '/scripts', label: 'Scripts', g: '¶' },
];

function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await api.sendFeedback(message.trim(), location.pathname);
      setMessage(''); setSent(true); setOpen(false);
      setTimeout(() => setSent(false), 4000);
    } catch { /* best-effort — don't block the teacher on a failed feedback send */ }
    setBusy(false);
  }

  if (!open) {
    return (
      <button type="button" className="link-toggle" style={{ background:'none', border:'none', cursor:'pointer', padding:0 }} onClick={() => setOpen(true)}>
        {sent ? '✓ Thanks for the feedback!' : '💬 Send feedback'}
      </button>
    );
  }
  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'.4rem' }}>
      <textarea
        autoFocus rows={3} value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Something broken, confusing, or missing?"
        style={{ fontSize:'.82rem', width:'100%', resize:'vertical' }}
      />
      <div style={{ display:'flex', gap:'.4rem' }}>
        <button type="submit" className="btn btn-sage" style={{ fontSize:'.78rem', padding:'.35rem .7rem' }} disabled={busy || !message.trim()}>Send</button>
        <button type="button" className="btn btn-outline" style={{ fontSize:'.78rem', padding:'.35rem .7rem' }} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default function Sidebar() {
  const { teacher, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="hamburger-btn" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={'sidebar' + (open ? ' sidebar-open' : '')}>
        <button type="button" className="sidebar-close-btn" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
        <div className="sidebar-brand">
          <span className="sidebar-mark">SM</span>
          <div>
            <div className="sidebar-name">Sentra Merit</div>
            <div className="sidebar-sub">English · Maths · Science</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-glyph">{n.g}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {teacher && (
            <div className="sidebar-teacher">
              <div>
                <div className="teacher-name">{teacher.name}</div>
                <div className="teacher-email">{teacher.email}</div>
              </div>
              <button className="logout-btn" onClick={logout}>Log out</button>
            </div>
          )}
          <hr className="sidebar-rule" />
          <div style={{ marginBottom:'.6rem' }}><FeedbackWidget /></div>
          <p className="sidebar-note">AI marks are suggestions. A teacher reviews every script before it's final.</p>
        </div>
      </aside>
    </>
  );
}
