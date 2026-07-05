const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

async function ownsScript(scriptId, teacherId) {
  return !!(await prisma.script.findFirst({ where: { id: scriptId, teacher_id: teacherId } }));
}
async function ownsResult(resultId, teacherId) {
  const result = await prisma.aiResult.findUnique({ where: { id: resultId }, include: { script_answer: true } });
  if (!result) return null;
  const answer = result.script_answer;
  if (!(await ownsScript(answer.script_id, teacherId))) return null;
  return { result, answer };
}
async function finalise(scriptId) {
  const answers = await prisma.scriptAnswer.findMany({ where: { script_id: scriptId }, include: { result: true } });
  const results = answers.map(a => a.result);
  if (results.length > 0 && results.every(r => r?.reviewed === true)) {
    await prisma.script.update({ where: { id: scriptId }, data: { status: 'complete', total_marks_awarded: results.reduce((s, r) => s + r.final_marks, 0) } });
  }
}

router.get('/stats', async (req, res) => {
  const scripts = await prisma.script.findMany({ where: { teacher_id: req.teacherId } });
  const complete = scripts.filter(s => s.status === 'complete');
  const avg = complete.length ? Math.round(complete.reduce((s, x) => s + x.total_marks_awarded / x.total_marks_possible, 0) / complete.length * 1000) / 10 : 0;
  res.json({ total: scripts.length, pending_review: scripts.filter(s => s.status === 'review').length, complete: complete.length, avg_score: avg });
});

router.put('/:resultId/review', async (req, res) => {
  const { override_marks, note, action } = req.body;
  const owned = await ownsResult(req.params.resultId, req.teacherId);
  if (!owned) return res.status(404).json({ error: 'Result not found' });
  const { result, answer } = owned;
  let finalMarks = result.marks_awarded;
  if (action === 'override') {
    const p = parseInt(override_marks);
    if (isNaN(p) || p < 0 || p > result.max_marks) return res.status(400).json({ error: `Marks must be 0–${result.max_marks}` });
    finalMarks = p;
  }
  await prisma.aiResult.update({ where: { id: req.params.resultId }, data: { reviewed: true, override_marks: action === 'override' ? finalMarks : null, override_note: note || null, final_marks: finalMarks } });
  await finalise(answer.script_id);
  res.json({ success: true, finalMarks });
});

router.put('/script/:scriptId/approve-confident', async (req, res) => {
  if (!(await ownsScript(req.params.scriptId, req.teacherId))) return res.status(404).json({ error: 'Script not found' });
  const answers = await prisma.scriptAnswer.findMany({ where: { script_id: req.params.scriptId }, include: { result: true } });
  let count = 0;
  for (const a of answers) {
    const r = a.result;
    if (r && !r.reviewed && !r.needs_attention) { await prisma.aiResult.update({ where: { id: r.id }, data: { reviewed: true, final_marks: r.marks_awarded } }); count++; }
  }
  await finalise(req.params.scriptId);
  res.json({ success: true, approvedCount: count });
});

router.put('/script/:scriptId/approve-all', async (req, res) => {
  if (!(await ownsScript(req.params.scriptId, req.teacherId))) return res.status(404).json({ error: 'Script not found' });
  const answers = await prisma.scriptAnswer.findMany({ where: { script_id: req.params.scriptId }, include: { result: true } });
  for (const a of answers) {
    const r = a.result;
    if (r && !r.reviewed) await prisma.aiResult.update({ where: { id: r.id }, data: { reviewed: true, final_marks: r.marks_awarded } });
  }
  await finalise(req.params.scriptId);
  res.json({ success: true });
});

module.exports = router;
