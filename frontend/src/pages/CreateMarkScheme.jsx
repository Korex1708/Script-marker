import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
let _qid = 0;
const blank = () => ({ _k: ++_qid, question_number:'', question_text:'', max_marks:'', marking_type:'rubric', method_marks:'', answer_marks:'', accepted_answers:'' });
const SUBJECTS = ['English','Mathematics','Chemistry','Physics','Biology','Other'];

export default function CreateMarkScheme() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('manual');
  const [title, setTitle] = useState(''); const [subject, setSubject] = useState('English');
  const [questions, setQuestions] = useState([blank()]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [scanFiles, setScanFiles] = useState([]); const [scanning, setScanning] = useState(false); const [scanError, setScanError] = useState('');

  async function extract(e) {
    e.preventDefault(); setScanError('');
    if (!scanFiles.length) return setScanError('Choose at least one photo of the mark scheme.');
    setScanning(true);
    try {
      const fd = new FormData();
      scanFiles.forEach(f => fd.append('images', f));
      const draft = await api.extractMarkScheme(fd);
      setTitle(draft.title || '');
      setSubject(SUBJECTS.includes(draft.subject) ? draft.subject : 'English');
      setQuestions((draft.questions.length ? draft.questions : [{}]).map(q => ({
        _k: ++_qid,
        question_number: q.question_number != null ? String(q.question_number) : '',
        question_text: q.question_text || '',
        max_marks: q.max_marks != null ? String(q.max_marks) : '',
        marking_type: q.marking_type || 'rubric',
        method_marks: q.method_marks != null ? String(q.method_marks) : '',
        answer_marks: q.answer_marks != null ? String(q.answer_marks) : '',
        accepted_answers: (q.accepted_answers || []).join('\n'),
      })));
      setMode('manual');
    } catch (err) { setScanError(err.message); }
    setScanning(false);
  }

  function upd(k, f, v) {
    setQuestions(prev => prev.map(q => {
      if (q._k !== k) return q;
      const u = { ...q, [f]: v };
      if (u.marking_type === 'method_and_answer') u.max_marks = String((parseInt(u.method_marks)||0) + (parseInt(u.answer_marks)||0));
      return u;
    }));
  }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!title.trim()) return setError('Enter a title.');
    if (questions.some(q => !q.question_text.trim() || !q.max_marks)) return setError('Every question needs text and marks.');
    if (questions.some(q => q.marking_type === 'method_and_answer' && (!q.method_marks || !q.answer_marks))) return setError('Method + answer questions need both splits filled in.');
    setBusy(true);
    try {
      const s = await api.createMarkScheme({ title: title.trim(), subject, questions: questions.map((q,i) => ({
        question_number: q.question_number || i + 1, question_text: q.question_text.trim(),
        max_marks: q.max_marks, marking_type: q.marking_type,
        method_marks: q.method_marks, answer_marks: q.answer_marks,
        accepted_answers: ['exact_match','multi_accept'].includes(q.marking_type) ? q.accepted_answers.split('\n').map(a => a.trim()).filter(Boolean) : [],
      })) });
      navigate(`/mark-schemes/${s.id}`);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div>
      <div className="page-header"><span className="eyebrow">New scheme</span><h1>Build a mark scheme</h1>
        <p>{mode === 'scan' ? 'Upload photos of your paper mark scheme — AI reads it into questions you can then check and edit.' : 'Add each question and its marking guidance, or scan an existing mark scheme instead.'}</p>
      </div>

      <div className="mode-toggle" style={{ marginBottom:'1.25rem' }}>
        <button type="button" className={'mode-btn'+(mode==='manual'?' mode-btn-active':'')} onClick={() => setMode('manual')}>Build manually</button>
        <button type="button" className={'mode-btn'+(mode==='scan'?' mode-btn-active':'')} onClick={() => setMode('scan')}>Scan a mark scheme</button>
      </div>

      {mode === 'scan' && (
        <form onSubmit={extract} className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="field">
            <label>Photos of the mark scheme (one per page)</label>
            <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => setScanFiles(Array.from(e.target.files || []))} />
            {scanFiles.length > 0 && <span style={{ fontSize:'.8rem', color:'var(--ink-faint)' }}>{scanFiles.length} file{scanFiles.length>1?'s':''} selected</span>}
          </div>
          {scanError && <p style={{ color:'var(--pen)', fontSize:'.88rem', marginTop:'.6rem' }}>{scanError}</p>}
          <div className="action-bar" style={{ marginTop:'1rem' }}>
            <button type="submit" className="btn" disabled={scanning}>{scanning ? 'Reading mark scheme…' : 'Extract questions'}</button>
          </div>
        </form>
      )}

      <form onSubmit={submit} style={{ display: mode === 'scan' ? 'none' : 'block' }}>
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="field"><label>Scheme title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. English Language — Paper 1" /></div>
          <div className="field" style={{ maxWidth:'220px' }}>
            <label>Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {questions.map((q, i) => {
          const isMeth = q.marking_type === 'method_and_answer';
          const isAccept = ['exact_match','multi_accept'].includes(q.marking_type);
          return (
            <div key={q._k} className="qb-row">
              <div className="qb-top">
                <input type="number" placeholder="No." value={q.question_number} onChange={e => upd(q._k,'question_number',e.target.value)} style={{ maxWidth:'70px' }} />
                {isMeth ? (<>
                  <input type="number" placeholder="Method" value={q.method_marks} onChange={e => upd(q._k,'method_marks',e.target.value)} style={{ maxWidth:'100px' }} />
                  <input type="number" placeholder="Answer" value={q.answer_marks} onChange={e => upd(q._k,'answer_marks',e.target.value)} style={{ maxWidth:'100px' }} />
                  <span style={{ fontFamily:'var(--font-m)', fontSize:'.8rem', color:'var(--ink-faint)' }}>= {q.max_marks||0} total</span>
                </>) : (
                  <input type="number" placeholder="Max marks" value={q.max_marks} onChange={e => upd(q._k,'max_marks',e.target.value)} style={{ maxWidth:'120px' }} />
                )}
                <select value={q.marking_type} onChange={e => upd(q._k,'marking_type',e.target.value)} style={{ maxWidth:'200px' }}>
                  <option value="rubric">Rubric (essay)</option>
                  <option value="method_and_answer">Method + answer marks</option>
                  <option value="exact_match">Exact match</option>
                  <option value="multi_accept">Multiple accepted</option>
                </select>
                {questions.length > 1 && <button type="button" className="btn btn-outline" style={{ fontSize:'.78rem', marginLeft:'auto' }} onClick={() => setQuestions(p => p.filter(x => x._k !== q._k))}>Remove</button>}
              </div>
              <textarea placeholder={`Question ${i+1} text…`} value={q.question_text} onChange={e => upd(q._k,'question_text',e.target.value)} rows={2} style={{ width:'100%', marginBottom: isAccept ? '.7rem' : 0 }} />
              {isAccept && (
                <div className="field" style={{ margin:0 }}>
                  <label>Accepted answers (one per line)</label>
                  <textarea value={q.accepted_answers} onChange={e => upd(q._k,'accepted_answers',e.target.value)} rows={3} placeholder={q.marking_type === 'exact_match' ? "H2SO4\nH₂SO₄\nsulfuric acid" : "high melting point\nsoluble in water\nbrittle"} />
                  {q.marking_type === 'multi_accept' && <span style={{ fontSize:'.76rem', color:'var(--ink-faint)' }}>Each line is one valid point. Students score 1 mark per valid point up to the max.</span>}
                </div>
              )}
            </div>
          );
        })}

        <button type="button" className="btn btn-outline" style={{ marginBottom:'1.5rem' }} onClick={() => setQuestions(p => [...p, { ...blank(), question_number: p.length+1 }])}>+ Add question</button>
        {error && <p style={{ color:'var(--pen)', fontSize:'.88rem', marginBottom:'1rem' }}>{error}</p>}
        <div className="action-bar" style={{ marginTop:0 }}>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save mark scheme'}</button>
        </div>
      </form>
    </div>
  );
}
