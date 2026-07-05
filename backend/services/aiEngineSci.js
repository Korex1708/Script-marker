const { computeScienceFlag } = require('./flagging');
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

function buildPrompt(questionText, ocrText, maxMarks, markingType, acceptedAnswers, methodMarks, answerMarks) {
  const base = `You are an experienced science exam marker. Mark the student's answer strictly.\n\nQuestion (${maxMarks} marks): ${questionText}\n\nStudent's answer:\n"""\n${ocrText}\n"""\n\n`;

  if (markingType === 'exact_match') {
    return base + `Accepted answers (any of these scores full marks, case/spacing insensitive): ${JSON.stringify(acceptedAnswers)}\n\nRespond ONLY with JSON: {"marksAwarded": 0 or ${maxMarks}, "feedback": "<one sentence for the teacher>", "evidence": "<student answer quoted exactly>"}`;
  }
  if (markingType === 'multi_accept') {
    return base + `This is a ${maxMarks}-mark question where each correct point from this list scores one mark: ${JSON.stringify(acceptedAnswers)}\n\nAward one mark per distinct valid point found (max ${maxMarks}).\n\nRespond ONLY with JSON: {"marksAwarded": <0 to ${maxMarks}>, "feedback": "<brief teacher note>", "evidence": "<relevant part of student answer>"}`;
  }
  if (markingType === 'method_and_answer') {
    return base + `Method marks available: ${methodMarks}. Answer mark: ${answerMarks}.\nAward method marks for valid working even if the final answer is wrong. Award the answer mark only for a numerically correct final answer.\nIf the answer is correct but no working is shown, award 0 method marks and the answer mark only.\n\nRespond ONLY with JSON: {"methodAwarded": <0-${methodMarks}>, "answerAwarded": <0-${answerMarks}>, "feedback": "<brief teacher note>", "evidence": "<most relevant line of working>"}`;
  }
  return base + `Mark this answer using your professional judgement as a science examiner.\n\nRespond ONLY with JSON: {"marksAwarded": <0-${maxMarks}>, "feedback": "<2-3 sentences for the teacher>", "evidence": "<key sentence from the answer>"}`;
}

async function markSciAnswer(questionText, ocrEntry) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const { ocrText, markingType, acceptedAnswers = [], maxMarks, methodMarks, answerMarks, ocrConfidence = 1 } = ocrEntry;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: buildPrompt(questionText, ocrText, maxMarks, markingType, acceptedAnswers, methodMarks, answerMarks) }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const block = data.content.find(b => b.type === 'text');
  if (!block) throw new Error('No text in Anthropic response');
  let parsed;
  try { parsed = JSON.parse(block.text.replace(/```json|```/g, '').trim()); } catch { throw new Error(`Bad JSON from AI: ${block.text.slice(0, 150)}`); }

  const aiConfidence = 0.88;
  let marksAwarded, methodAwarded = null, answerAwarded = null;
  if (markingType === 'method_and_answer') {
    methodAwarded = Math.min(Math.max(parseInt(parsed.methodAwarded) || 0, 0), methodMarks);
    answerAwarded = Math.min(Math.max(parseInt(parsed.answerAwarded) || 0, 0), answerMarks);
    marksAwarded = methodAwarded + answerAwarded;
  } else {
    marksAwarded = Math.min(Math.max(parseInt(parsed.marksAwarded) || 0, 0), maxMarks);
  }

  const flagReason = computeScienceFlag({ ocrConfidence, aiConfidence, marksAwarded, maxMarks, markingType });
  return { marksAwarded, methodAwarded, answerAwarded, feedback: parsed.feedback || '', evidence: parsed.evidence || ocrText.slice(0, 80), aiConfidence, flagReason };
}

module.exports = { markSciAnswer };
