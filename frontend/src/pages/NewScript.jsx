import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
const SIM_STAGES = ['Reading script image…','Running OCR on each answer…','AI comparing against mark scheme…','Generating feedback…'];
const UPL_STAGES = ['Uploading images…','Running OCR (this can take a moment the first time)…','AI marking each answer…','Generating feedback…'];

export default function NewScript() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]); const [mode, setMode] = useState('simulated');
  const [name, setName] = useState(''); const [schemeId, setSchemeId] = useState('');
  const [detail, setDetail] = useState(null); const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false); const [stage, setStage] = useState(0); const [error, setError] = useState('');
  useEffect(() => { api.getMarkSchemes().then(s => { setSchemes(s); if (s.length) setSchemeId(s[0].id); }); }, []);
  useEffect(() => { setFiles({}); if (mode === 'upload' && schemeId) api.getMarkScheme(schemeId).then(setDetail); }, [schemeId, mode]);
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!name.trim()) return setError("Enter the student's name.");
    if (!schemeId) return setError('Choose a mark scheme.');
    if (mode === 'upload') {
      const missing = (detail?.questions || []).filter(q => !files[q.question_number]);
      if (missing.length) return setError(`Upload an image for question${missing.length>1?'s':''} ${missing.map(q=>q.question_number).join(', ')}.`);
    }
    setBusy(true); setStage(0);
    const stages = mode === 'upload' ? UPL_STAGES : SIM_STAGES;
    const t = setInterval(() => setStage(s => Math.min(s+1, stages.length-1)), mode==='upload' ? 1400 : 550);
    try {
      let script;
      if (mode === 'upload') {
        const fd = new FormData();
        fd.append('student_name', name.trim()); fd.append('mark_scheme_id', schemeId);
        detail.questions.forEach(q => fd.append(`question_${q.question_number}`, files[q.question_number]));
        script = await api.uploadScript(fd);
      } else {
        script = await api.createScript({ student_name: name.trim(), mark_scheme_id: schemeId });
      }
      clearInterval(t); navigate(`/scripts/${script.id}`);
    } catch (err) { clearInterval(t); setError(err.message); setBusy(false); }
  }
  if (busy) return (
    <div><div className="page-header"><span className="eyebrow">Processing</span><h1>Marking in progress</h1></div>
    <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
      <div className="spinner" style={{ margin:'0 auto 1.25rem', width:'24px', height:'24px' }} />
      <p style={{ fontFamily:'var(--font-m)', fontSize:'.85rem', color:'var(--ink-soft)' }}>{(mode==='upload'?UPL_STAGES:SIM_STAGES)[stage]}</p>
    </div></div>
  );
  return (
    <div>
      <Link to="/scripts" className="link-toggle" style={{ display: 'inline-block', marginBottom: '.75rem' }}>← Back to scripts</Link>
      <div className="page-header"><span className="eyebrow">New submission</span><h1>Mark a script</h1>
        <p>{mode==='simulated' ? 'OCR and AI marking are simulated — no files needed. Shows the full pipeline immediately.' : 'Upload one photo per question. Real OCR runs on each image, then AI marks the extracted text.'}</p>
      </div>
      <form onSubmit={submit} className="card">
        <div className="mode-toggle">
          <button type="button" className={'mode-btn'+(mode==='simulated'?' mode-btn-active':'')} onClick={() => setMode('simulated')}>Simulated demo</button>
          <button type="button" className={'mode-btn'+(mode==='upload'?' mode-btn-active':'')} onClick={() => setMode('upload')}>Upload real images</button>
        </div>
        <div className="field"><label>Student name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ngozi Adeyemi" autoFocus /></div>
        <div className="field"><label>Mark scheme</label>
          <select value={schemeId} onChange={e=>setSchemeId(e.target.value)}>
            {schemes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        {mode === 'simulated' ? (
          <div className="upload-placeholder"><div className="upload-glyph">⤓</div>Script image upload (simulated in this mode)</div>
        ) : (
          <div className="field"><label>One image per question</label>
            {!detail ? <p style={{ fontSize:'.85rem', color:'var(--ink-faint)' }}>Loading questions…</p>
            : detail.questions.sort((a,b)=>a.question_number-b.question_number).map(q => (
              <div key={q.id} className="upload-row">
                <span className="upload-q-label">Q{q.question_number}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFiles(p=>({...p,[q.question_number]:e.target.files[0]||null}))} />
                {files[q.question_number] && <span className="upload-filename">{files[q.question_number].name}</span>}
              </div>
            ))}
          </div>
        )}
        {error && <p style={{ color:'var(--pen)', fontSize:'.88rem', marginTop:'.8rem' }}>{error}</p>}
        <div className="action-bar">
          <button type="submit" className="btn">{mode==='upload'?'Upload & mark':'Scan & mark script'}</button>
          <Link to="/scripts" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
