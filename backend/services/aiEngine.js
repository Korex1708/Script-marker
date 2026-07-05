const { computeEnglishFlag } = require('./flagging');
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

async function markEnglishAnswer(questionText, ocrText, maxMarks, ocrConfidence = 1) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const prompt = `You are an experienced English exam marker. Mark the student's answer strictly.\n\nQuestion (${maxMarks} marks): ${questionText}\n\nStudent's answer:\n"""\n${ocrText}\n"""\n\nRespond ONLY with JSON: {"marksAwarded": <0-${maxMarks}>, "feedback": "<2-3 sentences for the teacher>", "evidence": "<the single most impactful sentence from the answer, quoted exactly>"}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const data = await res.json();
  const block = data.content.find(b => b.type === 'text');
  let p; try { p = JSON.parse(block.text.replace(/```json|```/g, '').trim()); } catch { throw new Error('Bad JSON from AI'); }
  const marksAwarded = Math.min(Math.max(parseInt(p.marksAwarded) || 0, 0), maxMarks);
  const aiConfidence = 0.88;
  const flagReason = computeEnglishFlag({ ocrConfidence, aiConfidence, marksAwarded, maxMarks });
  return { marksAwarded, feedback: p.feedback || '', aiConfidence, evidence: p.evidence || ocrText.slice(0, 80), flagReason };
}
module.exports = { markEnglishAnswer };
