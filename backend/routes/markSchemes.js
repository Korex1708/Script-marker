const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const { toAcceptedAnswersJson, withAcceptedAnswers } = require('../db/serialize');

router.get('/', async (req, res) => {
  const schemes = await prisma.markScheme.findMany({
    where: { teacher_id: req.teacherId },
    include: { _count: { select: { questions: true } } },
    orderBy: { created_at: 'desc' },
  });
  res.json(schemes.map(({ _count, ...s }) => ({ ...s, question_count: _count.questions })));
});

router.get('/:id', async (req, res) => {
  const s = await prisma.markScheme.findFirst({
    where: { id: req.params.id, teacher_id: req.teacherId },
    include: { questions: { orderBy: { question_number: 'asc' } } },
  });
  if (!s) return res.status(404).json({ error: 'Mark scheme not found' });
  res.json({ ...s, questions: s.questions.map(withAcceptedAnswers) });
});

router.post('/', async (req, res) => {
  const { title, subject = 'English', questions } = req.body;
  if (!title || !questions?.length) return res.status(400).json({ error: 'Title and at least one question required.' });
  const totalMarks = questions.reduce((sum, q) => sum + parseInt(q.max_marks || 0), 0);
  const s = await prisma.markScheme.create({
    data: {
      teacher_id: req.teacherId, title, subject, total_marks: totalMarks,
      questions: {
        create: questions.map(q => {
          const isMeth = q.marking_type === 'method_and_answer';
          return {
            question_number: parseInt(q.question_number), question_text: q.question_text, max_marks: parseInt(q.max_marks),
            marking_type: q.marking_type || 'rubric',
            method_marks: isMeth ? parseInt(q.method_marks || 0) : null,
            answer_marks: isMeth ? parseInt(q.answer_marks || 0) : null,
            accepted_answers: toAcceptedAnswersJson(q.accepted_answers),
          };
        }),
      },
    },
  });
  res.status(201).json(s);
});

router.delete('/:id', async (req, res) => {
  const s = await prisma.markScheme.findFirst({ where: { id: req.params.id, teacher_id: req.teacherId } });
  if (!s) return res.status(404).json({ error: 'Mark scheme not found' });
  try {
    await prisma.markScheme.delete({ where: { id: req.params.id } });
  } catch {
    return res.status(409).json({ error: 'This mark scheme already has scripts marked against it and can’t be deleted.' });
  }
  res.json({ success: true });
});

module.exports = router;
