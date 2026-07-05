const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../db/prisma');
const { toAcceptedAnswersJson, withAcceptedAnswers } = require('../db/serialize');
const { validateImageFiles } = require('../services/imageValidation');
const { extractTextFromImage } = require('../services/ocrEngine');
const { extractMarkScheme } = require('../services/markSchemeExtractor');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname || '').slice(0, 10)}`),
});
const upload = multer({
  storage, limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => { const ok = ['image/png','image/jpeg','image/jpg','image/webp'].includes(file.mimetype); cb(ok ? null : new Error('Only PNG, JPEG, or WEBP supported.'), ok); },
});

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

// POST /api/mark-schemes/extract — OCR + AI-read one or more photos of a paper mark
// scheme into a draft { title, subject, questions } for the teacher to review and edit
// before saving. Nothing is written to the database here.
router.post('/extract', upload.array('images', 10), async (req, res) => {
  const files = req.files || [];
  const cleanup = () => files.forEach(f => fs.unlink(f.path, () => {}));
  if (!files.length) return res.status(400).json({ error: 'Upload at least one photo of the mark scheme.' });
  if (!validateImageFiles(files)) { cleanup(); return res.status(400).json({ error: 'One or more files are not valid PNG, JPEG, or WEBP images.' }); }
  if (!process.env.ANTHROPIC_API_KEY) { cleanup(); return res.status(400).json({ error: 'Real AI is required to scan a mark scheme — set ANTHROPIC_API_KEY in backend/.env.' }); }
  try {
    const pages = await Promise.all(files.map(f => extractTextFromImage(f.path)));
    const combinedText = pages.map((p, i) => `--- Page ${i + 1} ---\n${p.text || '(no text detected)'}`).join('\n\n');
    const draft = await extractMarkScheme(combinedText);
    cleanup();
    res.json(draft);
  } catch (err) {
    cleanup();
    res.status(500).json({ error: err.message });
  }
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
