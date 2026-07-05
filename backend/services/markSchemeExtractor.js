const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const SUBJECTS = ['English', 'Mathematics', 'Chemistry', 'Physics', 'Biology', 'Other'];
const MARKING_TYPES = ['rubric', 'method_and_answer', 'exact_match', 'multi_accept'];

function buildPrompt(ocrText) {
  return `You are helping a teacher digitize a paper mark scheme into a structured format for an AI marking tool.

Below is OCR-extracted text from one or more pages of a mark scheme / rubric document. It may be messy — tables flattened into plain text, OCR misreads, inconsistent spacing. Do your best to identify each distinct question and its marking guidance.

OCR text:
"""
${ocrText}
"""

For each question, determine:
- question_number: the question's number (integer)
- question_text: the question itself, or a short descriptor of what it's asking
- max_marks: total marks available for the question (integer)
- marking_type: one of "rubric" (extended/essay answer marked holistically against level descriptors), "method_and_answer" (maths/science calculation with separate method and final-answer marks), "exact_match" (single correct short answer), "multi_accept" (a list of individually-creditable acceptable points)
- method_marks, answer_marks: ONLY when marking_type is "method_and_answer" — how max_marks splits between method and answer (numbers, otherwise null)
- accepted_answers: ONLY when marking_type is "exact_match" or "multi_accept" — an array of acceptable answer strings drawn from the document (otherwise an empty array)

Also guess an overall title for this mark scheme and which subject it's for.

Respond ONLY with JSON in this exact shape:
{"title": "<best-guess title, or null if unclear>", "subject": "<one of ${SUBJECTS.join(', ')}, or null if unclear>", "questions": [{"question_number": 1, "question_text": "...", "max_marks": 4, "marking_type": "rubric", "method_marks": null, "answer_marks": null, "accepted_answers": []}]}`;
}

async function extractMarkScheme(ocrText) {
  if (!KEY) throw new Error('Real AI is required to scan a mark scheme — set ANTHROPIC_API_KEY in backend/.env.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: buildPrompt(ocrText) }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const block = data.content.find(b => b.type === 'text');
  if (!block) throw new Error('No text in Anthropic response');
  let parsed;
  try { parsed = JSON.parse(block.text.replace(/```json|```/g, '').trim()); } catch { throw new Error(`Bad JSON from AI: ${block.text.slice(0, 200)}`); }

  const title = typeof parsed.title === 'string' ? parsed.title : '';
  const subject = SUBJECTS.includes(parsed.subject) ? parsed.subject : 'English';
  const questions = (Array.isArray(parsed.questions) ? parsed.questions : []).map((q, i) => {
    const marking_type = MARKING_TYPES.includes(q.marking_type) ? q.marking_type : 'rubric';
    const isMeth = marking_type === 'method_and_answer';
    const isAccept = marking_type === 'exact_match' || marking_type === 'multi_accept';
    const maxMarks = Math.max(parseInt(q.max_marks) || 0, 0);
    return {
      question_number: parseInt(q.question_number) || i + 1,
      question_text: typeof q.question_text === 'string' ? q.question_text : '',
      max_marks: maxMarks,
      marking_type,
      method_marks: isMeth ? Math.max(parseInt(q.method_marks) || 0, 0) : null,
      answer_marks: isMeth ? Math.max(parseInt(q.answer_marks) || 0, 0) : null,
      accepted_answers: isAccept && Array.isArray(q.accepted_answers) ? q.accepted_answers.filter(a => typeof a === 'string') : [],
    };
  });

  return { title, subject, questions };
}

module.exports = { extractMarkScheme };
