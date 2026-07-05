import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../api';
import StudentHeader from '../components/StudentHeader';

export default function StudentResults() {
  const [results, setResults] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { studentApi.getResults().then(setResults).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;
  return (
    <div className="main-panel" style={{ maxWidth: '760px', margin: '0 auto' }}>
      <StudentHeader />
      <div className="page-header" style={{ marginTop: '.5rem' }}><p>Results appear here once your teacher has finished reviewing your script.</p></div>
      <div className="card">
        {results.length === 0 ? <div className="empty-state"><span className="empty-glyph">¶</span>No results yet.</div>
        : results.map(r => (
          <Link key={r.id} to={`/student/results/${r.id}`} style={{ display: 'block' }}>
            <div className="list-row">
              <div><div className="title">{r.mark_scheme_title}</div><div className="meta">{r.subject} · {new Date(r.submitted_at).toLocaleDateString()}</div></div>
              <span style={{ fontFamily: 'var(--font-m)', fontSize: '.95rem', fontWeight: 500 }}>{r.total_marks_awarded}/{r.total_marks_possible}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
