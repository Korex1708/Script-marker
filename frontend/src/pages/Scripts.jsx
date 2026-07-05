import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function ExportBar({ scripts }) {
  const [schemeId, setSchemeId] = useState('');
  const [error, setError] = useState('');
  const schemes = [...new Map(scripts.map(s => [s.mark_scheme_id, { id: s.mark_scheme_id, title: s.mark_scheme_title }])).values()].filter(s => s.id);
  const completed = scripts.filter(s => s.status === 'complete');
  if (completed.length === 0) return null;
  async function download() {
    setError('');
    try { await api.exportCsv(schemeId || undefined); } catch (err) { setError(err.message); }
  }
  return (
    <div style={{ marginBottom:'1.25rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.7rem', background:'var(--card)', border:'1px solid var(--line)', borderRadius:'6px', padding:'.9rem 1.1rem' }}>
        <span style={{ fontSize:'.85rem', color:'var(--ink-soft)' }}>Export {completed.length} completed script{completed.length > 1 ? 's' : ''}</span>
        <select value={schemeId} onChange={e => setSchemeId(e.target.value)} style={{ flex:1, maxWidth:'280px' }}>
          <option value="">All schemes</option>
          {schemes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button type="button" onClick={download} className="btn btn-outline" style={{ fontSize:'.82rem' }}>↓ CSV</button>
      </div>
      {error && <p style={{ color:'var(--pen)', fontSize:'.82rem', marginTop:'.5rem' }}>{error}</p>}
    </div>
  );
}

export default function Scripts() {
  const [scripts, setScripts] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.getScripts().then(setScripts).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;
  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ margin:0 }}><span className="eyebrow">Scripts</span><h1>Submitted scripts</h1></div>
        <Link to="/scripts/new" className="btn">+ Mark a script</Link>
      </div>
      <ExportBar scripts={scripts} />
      <div className="card">
        {scripts.length === 0 ? <div className="empty-state"><span className="empty-glyph">¶</span>No scripts yet. Submit one to see the full pipeline.</div>
        : scripts.map(s => (
          <Link key={s.id} to={`/scripts/${s.id}`} style={{ display:'block' }}>
            <div className="list-row">
              <div><div className="title">{s.student_name}</div><div className="meta">{s.mark_scheme_title} · {new Date(s.submitted_at).toLocaleDateString()}</div></div>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                {s.total_marks_awarded != null && <span style={{ fontFamily:'var(--font-m)', fontSize:'.85rem', color:'var(--ink-soft)' }}>{s.total_marks_awarded}/{s.total_marks_possible}</span>}
                <span className={`tag tag-${s.status}`}>{s.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
