import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
const TYPE_LABELS = { rubric:'Rubric (essay)', method_and_answer:'Method + answer', exact_match:'Exact match', multi_accept:'Multiple accepted' };
export default function MarkSchemeDetail() {
  const { id } = useParams(); const [scheme, setScheme] = useState(null);
  useEffect(() => { api.getMarkScheme(id).then(setScheme); }, [id]);
  if (!scheme) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;
  return (
    <div>
      <div className="page-header"><span className="eyebrow">{scheme.subject}</span><h1>{scheme.title}</h1><p>{scheme.questions.length} questions · {scheme.total_marks} marks total</p></div>
      <div className="card">
        {scheme.questions.sort((a,b) => a.question_number - b.question_number).map(q => (
          <div key={q.id} className="list-row" style={{ alignItems:'flex-start' }}>
            <div>
              <div className="title">Q{q.question_number}. {q.question_text}</div>
              <div className="meta" style={{ marginTop:'.35rem' }}>
                {TYPE_LABELS[q.marking_type] || q.marking_type}
                {q.marking_type === 'method_and_answer' && ` · ${q.method_marks}M + ${q.answer_marks}A`}
                {['exact_match','multi_accept'].includes(q.marking_type) && q.accepted_answers?.length > 0 && ` · accepts: ${q.accepted_answers.slice(0,3).join(', ')}${q.accepted_answers.length > 3 ? '…' : ''}`}
              </div>
            </div>
            <span style={{ fontFamily:'var(--font-m)', fontSize:'.9rem', whiteSpace:'nowrap' }}>
              {q.marking_type === 'method_and_answer' ? `${q.method_marks}M+${q.answer_marks}A=${q.max_marks}` : `${q.max_marks} marks`}
            </span>
          </div>
        ))}
      </div>
      <div className="action-bar">
        <Link to="/scripts/new" className="btn">Mark a script with this scheme</Link>
        <Link to="/mark-schemes" className="btn btn-outline">Back</Link>
      </div>
    </div>
  );
}
