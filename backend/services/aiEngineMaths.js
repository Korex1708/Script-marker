const { computeMathsFlag } = require('./flagging');
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

async function markMathsAnswer(questionText, ocrEntry) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const { ocrText, methodMarks, answerMarks, ocrConfidence = 1 } = ocrEntry;
  const prompt = `You are an experienced maths exam marker. Mark this response strictly.\n\nQuestion: ${questionText}\nMethod marks: ${methodMarks}, Answer mark: ${answerMarks}\n\nStudent's working:\n"""\n${ocrText}\n"""\n\nRules: award method marks for valid working even if the final answer is wrong. Award the answer mark ONLY for a numerically correct final answer. If the answer is correct but no working is shown, award 0 method marks.\n\nRespond ONLY with JSON: {"methodAwarded": <0-${methodMarks}>, "answerAwarded": <0-${answerMarks}>, "feedback": "<brief teacher note>", "evidence": "<most relevant line>"}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const data = await res.json();
  const block = data.content.find(b => b.type === 'text');
  let p; try { p = JSON.parse(block.text.replace(/```json|```/g, '').trim()); } catch { throw new Error('Bad JSON from AI'); }
  const mA = Math.min(Math.max(parseInt(p.methodAwarded) || 0, 0), methodMarks);
  const aA = Math.min(Math.max(parseInt(p.answerAwarded) || 0, 0), answerMarks);
  const aiConfidence = 0.88;
  const flagReason = computeMathsFlag({ ocrConfidence, aiConfidence, methodAwarded: mA, answerAwarded: aA, answerMarks });
  return { marksAwarded: mA + aA, methodAwarded: mA, answerAwarded: aA, feedback: p.feedback || '', aiConfidence, evidence: p.evidence || ocrText.split('\n').pop() || '', flagReason };
}
module.exports = { markMathsAnswer };
