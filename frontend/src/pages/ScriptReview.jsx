import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

function flagText(reason) {
  return { low_ocr:'Low OCR confidence — worth reading in full', low_ai:'Low AI confidence — worth reading in full', boundary:'Mark sits near a grade boundary', method_mismatch:'Correct answer but no method shown', spot_check:'Randomly selected for spot-check — routine quality check' }[reason] || 'Worth reading in full';
}

function AnswerBlock({ answer, isMaths, isSci, onApprove, onOverride, busy }) {
  const [expanded, setExpanded] = useState(!!answer.needs_attention);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideVal, setOverrideVal] = useState('');

  function stampClass() { if (!answer.reviewed) return answer.needs_attention ? 'flagged' : 'ai'; return answer.override_marks != null ? 'overridden' : 'approved'; }
  const displayMono = isMaths || answer.marking_type === 'method_and_answer';

  return (
    <div className="answer-block">
      <div>
        <div className="q-label">Q{answer.question_number} · {answer.marking_type || 'rubric'} · {answer.max_marks} mark{answer.max_marks > 1 ? 's' : ''}</div>
        <div className="q-text">{answer.question_text}</div>
        {answer.needs_attention && !answer.reviewed && (
          <div className={`flag-banner${answer.flag_reason === 'spot_check' ? ' spot-check' : ''}`}>
            {answer.flag_reason === 'spot_check' ? '🎲' : '⚠'} {flagText(answer.flag_reason)}
          </div>
        )}
        {answer.image_path && (
          <details style={{ marginBottom:'.7rem' }}>
            <summary className="link-toggle" style={{ cursor:'pointer' }}>View original uploaded image</summary>
            <img src={answer.image_path} alt={`Q${answer.question_number} submitted answer`} style={{ maxWidth:'100%', marginTop:'.5rem', border:'1px solid var(--line)', borderRadius:'4px' }} />
          </details>
        )}
        {!expanded ? (
          <div className="evidence-box">
            <span className="evidence-label">{displayMono ? 'Final line AI checked' : 'Evidence AI marked against'}</span>
            <p className={displayMono ? '' : ''} style={{ fontFamily: displayMono ? 'var(--font-m)' : 'inherit', fontStyle: displayMono ? 'normal' : 'italic' }}>
              {displayMono ? answer.evidence : <>&ldquo;{answer.evidence}&rdquo;</>}
            </p>
          </div>
        ) : (
          <div className={displayMono ? 'ocr-text ocr-text-mono' : 'ocr-text'}>{answer.ocr_text}</div>
        )}
        <button className="link-toggle" onClick={() => setExpanded(e => !e)}>{expanded ? '↑ Collapse to evidence only' : '↓ Read full answer'}</button>
        <div className="feedback-box">{answer.feedback}</div>
        {answer.method_awarded != null && (
          <div className="method-breakdown">
            <span className={answer.method_awarded === answer.method_marks ? 'mark-full' : 'mark-partial'}>Method {answer.method_awarded}/{answer.method_marks}</span>
            <span className={answer.answer_awarded === answer.answer_marks ? 'mark-full' : 'mark-partial'}>Answer {answer.answer_awarded}/{answer.answer_marks}</span>
          </div>
        )}
        <div style={{ marginBottom:'.7rem', maxWidth:'220px' }}>
          <div className="conf-track"><div className="conf-fill" style={{ width:`${Math.round(answer.ocr_confidence*100)}%` }} /></div>
          <div className="conf-label">OCR confidence {Math.round(answer.ocr_confidence*100)}%</div>
        </div>
        {!answer.reviewed ? (
          showOverride ? (
            <div className="override-row">
              <input type="number" min={0} max={answer.max_marks} placeholder="Marks" value={overrideVal} onChange={e => setOverrideVal(e.target.value)} />
              <span style={{ fontFamily:'var(--font-m)', fontSize:'.82rem', color:'var(--ink-soft)' }}>/ {answer.max_marks}</span>
              <button className="btn btn-pen" style={{ fontSize:'.8rem' }} disabled={busy} onClick={() => { onOverride(answer, overrideVal); setShowOverride(false); }}>Confirm</button>
              <button className="btn btn-outline" style={{ fontSize:'.8rem' }} onClick={() => setShowOverride(false)}>Cancel</button>
            </div>
          ) : (
            <div className="override-row">
              <button className="btn btn-sage" style={{ fontSize:'.8rem' }} disabled={busy} onClick={() => onApprove(answer)}>✓ Approve {answer.marks_awarded}/{answer.max_marks}</button>
              <button className="btn btn-outline" style={{ fontSize:'.8rem' }} onClick={() => setShowOverride(true)}>Override mark</button>
            </div>
          )
        ) : (
          <div style={{ fontSize:'.82rem', color:'var(--ink-soft)' }}>
            {answer.override_marks != null ? `Overridden to ${answer.final_marks}/${answer.max_marks}` : 'Approved as AI-suggested'}
          </div>
        )}
      </div>
      <div className="stamp-col">
        <div className={`stamp ${stampClass()}`}><span>{answer.final_marks ?? answer.marks_awarded}</span><span className="frac">/ {answer.max_marks}</span></div>
      </div>
    </div>
  );
}

export default function ScriptReview() {
  const { id } = useParams(); const [script, setScript] = useState(null); const [busy, setBusy] = useState(false); const [bulkMsg, setBulkMsg] = useState('');
  async function load() { const d = await api.getScript(id); setScript(d); }
  useEffect(() => { load(); }, [id]);
  if (!script) return <div className="loading-overlay"><div className="spinner" />Loading…</div>;

  if (script.status === 'error') return (
    <div><div className="page-header"><span className="eyebrow">{script.mark_scheme_title}</span><h1>{script.student_name}</h1></div>
      <div className="card" style={{ textAlign:'center', padding:'2.5rem' }}>
        <p style={{ color:'var(--pen)', marginBottom:'1rem' }}>Processing failed. Check the backend terminal for details, then submit the script again.</p>
        <Link to="/scripts/new" className="btn">Submit again</Link>
      </div>
      <div className="action-bar"><Link to="/scripts" className="btn btn-outline">Back</Link></div>
    </div>
  );

  const isMaths = script.subject === 'Mathematics';
  const isSci = ['Chemistry','Physics'].includes(script.subject);
  const allReviewed = script.answers.every(a => a.reviewed);
  const flagged = script.answers.filter(a => a.needs_attention && !a.reviewed).length;
  const confident = script.answers.filter(a => !a.needs_attention && !a.reviewed).length;

  async function approve(answer) { setBusy(true); await api.reviewResult(answer.result_id, { action:'approve' }); await load(); setBusy(false); }
  async function override(answer, val) { setBusy(true); await api.reviewResult(answer.result_id, { action:'override', override_marks: val }); await load(); setBusy(false); }
  async function approveConfident() { setBusy(true); const r = await api.approveConfident(script.id); setBulkMsg(`Approved ${r.approvedCount} confident match${r.approvedCount===1?'':'es'}.`); await load(); setBusy(false); }
  async function approveAll() { setBusy(true); await api.approveAll(script.id); await load(); setBusy(false); }

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ margin:0 }}>
          <span className="eyebrow">{script.mark_scheme_title}</span>
          <h1>{script.student_name}</h1>
          <p>{flagged > 0 ? `${flagged} answer${flagged>1?'s':''} need${flagged===1?'s':''} your attention. Everything else is collapsed to its key evidence.` : 'Nothing flagged — skim the evidence lines and approve.'}</p>
        </div>
        <div style={{ display:'flex', gap:'.5rem', alignItems:'flex-start', marginTop:'.4rem', flexShrink:0 }}>
          {allReviewed && <button type="button" className="btn btn-outline" style={{ fontSize:'.8rem' }} onClick={() => api.openReport(script.id).catch(err => setBulkMsg(err.message))}>↗ Print report</button>}
          <span className={`tag tag-${script.status}`}>{script.status}</span>
        </div>
      </div>

      {confident > 0 && <div className="bulk-bar"><div><strong>{confident}</strong> answer{confident>1?'s':''} {confident===1?'has':'have'} high confidence and no boundary risk.</div><button className="btn btn-sage" disabled={busy} onClick={approveConfident}>Approve {confident} confident match{confident>1?'es':''}</button></div>}
      {bulkMsg && <p className="bulk-msg">{bulkMsg}</p>}

      <div className="card" style={{ padding:'0 1.7rem' }}>
        {script.answers.map(a => <AnswerBlock key={a.id} answer={a} isMaths={isMaths} isSci={isSci} onApprove={approve} onOverride={override} busy={busy} />)}
      </div>

      <div className="total-banner">
        <div><div className="total-label">{allReviewed ? 'Final score' : 'Provisional AI score'}</div><div className="total-num">{script.total_marks_awarded} / {script.total_marks_possible}</div></div>
        {!allReviewed && <button className="btn" style={{ background:'var(--brass)', borderColor:'var(--brass)' }} disabled={busy} onClick={approveAll}>Approve everything remaining</button>}
      </div>
      <div className="action-bar"><Link to="/scripts" className="btn btn-outline">Back to scripts</Link></div>
    </div>
  );
}
