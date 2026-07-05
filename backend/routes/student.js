const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const { withAcceptedAnswers } = require('../db/serialize');

// Students aren't linked to scripts by ID — there's no per-class roster in this app —
// so a result "belongs" to a student when the script's teacher matches theirs and the
// script's free-text student_name matches their registered name (case-insensitive).
// Known limitation: two students with the same name under one teacher would see the
// same results. Worth a proper roster if that becomes a real problem.
async function myCompletedScripts(studentId, extraWhere = {}) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { student: null, scripts: [] };
  const scripts = await prisma.script.findMany({
    where: { teacher_id: student.teacher_id, status: 'complete', student_name: { equals: student.name, mode: 'insensitive' }, ...extraWhere },
    include: { mark_scheme: { select: { title: true, subject: true } } },
    orderBy: { submitted_at: 'desc' },
  });
  return { student, scripts };
}

router.get('/results', async (req, res) => {
  const { scripts } = await myCompletedScripts(req.studentId);
  res.json(scripts.map(({ mark_scheme, ...s }) => ({ ...s, mark_scheme_title: mark_scheme?.title || null, subject: mark_scheme?.subject || null })));
});

router.get('/results/:scriptId', async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.studentId } });
  if (!student) return res.status(404).json({ error: 'Account not found.' });
  const script = await prisma.script.findFirst({
    where: { id: req.params.scriptId, teacher_id: student.teacher_id, status: 'complete', student_name: { equals: student.name, mode: 'insensitive' } },
    include: { mark_scheme: true, answers: { include: { result: true }, orderBy: { question_number: 'asc' } } },
  });
  if (!script) return res.status(404).json({ error: 'Result not found' });
  const { mark_scheme, answers, ...rest } = script;
  const shaped = answers.map(a => {
    const { result, script_id, ...ansRest } = withAcceptedAnswers(a);
    return { ...ansRest, marks_awarded: result?.final_marks ?? null, feedback: result?.feedback || null, evidence: result?.evidence || null };
  });
  res.json({ ...rest, mark_scheme_title: mark_scheme?.title || null, subject: mark_scheme?.subject || null, answers: shaped });
});

module.exports = router;
