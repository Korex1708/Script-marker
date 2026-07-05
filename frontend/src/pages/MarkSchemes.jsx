import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
const SUBJECT_COLORS = { English:'var(--brass)', Mathematics:'var(--pen)', Chemistry:'var(--sage)', Physics:'var(--ink-soft)' };
export default function MarkSchemes() {
  const [schemes, setSchemes] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMarkSchemes().then(setSchemes).finally(() => setLoading(false)); }, []);
  async function del(id, e) { e.preventDefault(); e.stopPropagation(); if (!confirm('Delete this mark scheme?')) return; await api.deleteMarkScheme(id); setSchemes(p => p.filter(s => s.id !== id)); }
  if (loading) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;
  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ margin:0 }}><span className="eyebrow">Mark schemes</span><h1>Rubrics &amp; questions</h1></div>
        <Link to="/mark-schemes/new" className="btn">+ New scheme</Link>
      </div>
      <div className="card">
        {schemes.length === 0 ? <div className="empty-state"><span className="empty-glyph">§</span>No mark schemes yet. Create one to start marking.</div>
        : schemes.map(s => (
          <Link key={s.id} to={`/mark-schemes/${s.id}`} style={{ display:'block' }}>
            <div className="list-row">
              <div><div className="title">{s.title}</div><div className="meta">{s.question_count} questions · {s.total_marks} marks</div></div>
              <div style={{ display:'flex', alignItems:'center', gap:'.7rem' }}>
                <span style={{ fontFamily:'var(--font-m)', fontSize:'.72rem', color: SUBJECT_COLORS[s.subject] || 'var(--ink-soft)' }}>{s.subject}</span>
                <button onClick={e => del(s.id, e)} className="btn btn-outline" style={{ fontSize:'.78rem', padding:'.35rem .7rem' }}>Delete</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
