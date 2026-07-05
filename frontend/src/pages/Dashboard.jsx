import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
export default function Dashboard() {
  const [stats, setStats] = useState(null); const [scripts, setScripts] = useState([]);
  useEffect(() => { Promise.all([api.getStats(), api.getScripts()]).then(([s, sc]) => { setStats(s); setScripts(sc.slice(0, 6)); }); }, []);
  if (!stats) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;
  return (
    <div>
      <div className="page-header"><span className="eyebrow">Overview</span><h1>Marking desk</h1><p>Scripts are OCR'd and given an AI-suggested mark. Nothing reaches a student until you've reviewed it here.</p></div>
      <div className="stat-row">
        <div className="stat-cell"><span className="label">Total scripts</span><span className="value">{stats.total}</span></div>
        <div className="stat-cell"><span className="label">Awaiting review</span><span className="value" style={{ color:'var(--brass)' }}>{stats.pending_review}</span></div>
        <div className="stat-cell"><span className="label">Completed</span><span className="value" style={{ color:'var(--sage)' }}>{stats.complete}</span></div>
        <div className="stat-cell"><span className="label">Avg. score</span><span className="value">{stats.avg_score}%</span></div>
      </div>
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'.5rem' }}>
          <h2 style={{ fontSize:'1.15rem' }}>Recent scripts</h2>
          <Link to="/scripts" className="btn btn-outline" style={{ fontSize:'.8rem', padding:'.4rem .8rem' }}>View all</Link>
        </div>
        <hr className="hairline" style={{ margin:'.75rem 0' }} />
        {scripts.length === 0 ? <div className="empty-state"><span className="empty-glyph">¶</span>No scripts yet. Submit one to see the AI pipeline in action.</div>
        : scripts.map(s => (
          <Link key={s.id} to={`/scripts/${s.id}`} style={{ display:'block' }}>
            <div className="list-row">
              <div><div className="title">{s.student_name}</div><div className="meta">{s.mark_scheme_title}</div></div>
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
