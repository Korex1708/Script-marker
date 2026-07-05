import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentApi } from '../api';
import StudentHeader from '../components/StudentHeader';

export default function StudentResultDetail() {
  const { id } = useParams();
  const [script, setScript] = useState(null);
  useEffect(() => { studentApi.getResult(id).then(setScript); }, [id]);
  if (!script) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;
  return (
    <div className="main-panel" style={{ maxWidth: '760px', margin: '0 auto' }}>
      <StudentHeader />
      <div className="page-header" style={{ marginTop: '.5rem' }}>
        <span className="eyebrow">{script.mark_scheme_title}</span>
        <h1 style={{ fontSize: '1.6rem' }}>{script.subject}</h1>
      </div>
      <div className="card" style={{ padding: '0 1.7rem' }}>
        {script.answers.map(a => (
          <div key={a.id} className="answer-block">
            <div>
              <div className="q-label">Q{a.question_number} · {a.max_marks} mark{a.max_marks > 1 ? 's' : ''}</div>
              <div className="q-text">{a.question_text}</div>
              <div className="feedback-box">{a.feedback || 'No feedback recorded for this question.'}</div>
            </div>
            <div className="stamp-col">
              <div className="stamp approved"><span>{a.marks_awarded}</span><span className="frac">/ {a.max_marks}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="total-banner">
        <div><div className="total-label">Final score</div><div className="total-num">{script.total_marks_awarded} / {script.total_marks_possible}</div></div>
      </div>
      <div className="action-bar"><Link to="/student/results" className="btn btn-outline">Back to results</Link></div>
    </div>
  );
}
