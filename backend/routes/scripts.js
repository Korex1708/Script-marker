const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../db/prisma');
const { toAcceptedAnswersJson, withAcceptedAnswers } = require('../db/serialize');
const { mockOcrScript } = require('../services/mockOcr');
const { mockOcrMathsScript } = require('../services/mockOcrMaths');
const { mockOcrSciScript } = require('../services/mockOcrSci');
const { extractTextFromImage } = require('../services/ocrEngine');
const { markAnswer } = require('../services/markingService');
const { validateImageFiles } = require('../services/imageValidation');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname || '').slice(0, 10)}`),
});
const upload = multer({
  storage, limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { const ok = ['image/png','image/jpeg','image/jpg','image/webp'].includes(file.mimetype); cb(ok ? null : new Error('Only PNG, JPEG, or WEBP supported.'), ok); },
});

function buildAnswerRow(answer) {
  const { result, ...rest } = withAcceptedAnswers(answer);
  return {
    ...rest, result_id: result?.id || null, marks_awarded: result?.marks_awarded ?? null, result_max_marks: result?.max_marks ?? null,
    method_awarded: result?.method_awarded ?? null, answer_awarded: result?.answer_awarded ?? null, feedback: result?.feedback || null,
    evidence: result?.evidence || null, flag_reason: result?.flag_reason || null, needs_attention: result?.needs_attention || false,
    ai_confidence: result?.ai_confidence ?? null, reviewed: result?.reviewed || false, override_marks: result?.override_marks ?? null,
    override_note: result?.override_note || null, final_marks: result?.final_marks ?? null,
  };
}

router.get('/', async (req, res) => {
  const scripts = await prisma.script.findMany({
    where: { teacher_id: req.teacherId },
    include: { mark_scheme: { select: { title: true } } },
    orderBy: { submitted_at: 'desc' },
  });
  res.json(scripts.map(({ mark_scheme, ...s }) => ({ ...s, mark_scheme_title: mark_scheme?.title || null })));
});

router.get('/:id', async (req, res) => {
  const script = await prisma.script.findFirst({
    where: { id: req.params.id, teacher_id: req.teacherId },
    include: { mark_scheme: true, answers: { include: { result: true }, orderBy: { question_number: 'asc' } } },
  });
  if (!script) return res.status(404).json({ error: 'Script not found' });
  const { mark_scheme, answers, ...rest } = script;
  res.json({ ...rest, mark_scheme_title: mark_scheme?.title || null, subject: mark_scheme?.subject || null, answers: answers.map(buildAnswerRow) });
});

async function processQuestions({ scriptId, subject, ocrResults, isUpload }) {
  let totalAwarded = 0;
  for (const ocr of ocrResults) {
    const answer = await prisma.scriptAnswer.create({
      data: {
        script_id: scriptId, question_number: ocr.questionNumber, question_text: ocr.questionText, max_marks: ocr.maxMarks,
        marking_type: ocr.markingType || null, accepted_answers: toAcceptedAnswersJson(ocr.acceptedAnswers),
        method_marks: ocr.methodMarks || null, answer_marks: ocr.answerMarks || null,
        ocr_text: ocr.ocrText, ocr_confidence: ocr.ocrConfidence, flagged: !!ocr.flagged, image_path: ocr.imagePath || null,
      },
    });
    const ai = await markAnswer({ subject, questionText: ocr.questionText, ocrText: ocr.ocrText, maxMarks: ocr.maxMarks, ocrConfidence: ocr.ocrConfidence, mockOcrEntry: ocr, isUpload });
    totalAwarded += ai.marksAwarded;
    await prisma.aiResult.create({
      data: {
        script_answer_id: answer.id, marks_awarded: ai.marksAwarded, max_marks: ocr.maxMarks, method_awarded: ai.methodAwarded ?? null,
        answer_awarded: ai.answerAwarded ?? null, feedback: ai.feedback, ai_confidence: ai.aiConfidence, evidence: ai.evidence,
        flag_reason: ai.flagReason, needs_attention: ai.flagReason !== null, final_marks: ai.marksAwarded,
      },
    });
  }
  return totalAwarded;
}

router.post('/', async (req, res) => {
  const { student_name, mark_scheme_id } = req.body;
  if (!student_name || !mark_scheme_id) return res.status(400).json({ error: 'student_name and mark_scheme_id required.' });
  const scheme = await prisma.markScheme.findFirst({
    where: { id: mark_scheme_id, teacher_id: req.teacherId },
    include: { questions: { orderBy: { question_number: 'asc' } } },
  });
  if (!scheme) return res.status(404).json({ error: 'Mark scheme not found' });
  const questions = scheme.questions.map(withAcceptedAnswers);
  const isMaths = scheme.subject === 'Mathematics', isSci = ['Chemistry','Physics'].includes(scheme.subject);
  const script = await prisma.script.create({
    data: { teacher_id: req.teacherId, student_name: student_name.trim(), mark_scheme_id, status: 'processing', total_marks_possible: scheme.total_marks, source: 'simulated' },
  });
  const ocrResults = isMaths ? mockOcrMathsScript(questions) : isSci ? mockOcrSciScript(questions, scheme.subject) : mockOcrScript(script.id, questions);
  try {
    const totalAwarded = await processQuestions({ scriptId: script.id, subject: scheme.subject, ocrResults, isUpload: false });
    await prisma.script.update({ where: { id: script.id }, data: { status: 'review', total_marks_awarded: totalAwarded, processed_at: new Date() } });
  } catch (err) {
    await prisma.script.update({ where: { id: script.id }, data: { status: 'error' } });
    return res.status(500).json({ error: err.message });
  }
  res.status(201).json(await prisma.script.findUnique({ where: { id: script.id } }));
});

router.post('/upload', upload.any(), async (req, res) => {
  const { student_name, mark_scheme_id } = req.body;
  const files = req.files || [];
  const cleanup = () => files.forEach(f => fs.unlink(f.path, () => {}));
  if (!student_name || !mark_scheme_id) { cleanup(); return res.status(400).json({ error: 'student_name and mark_scheme_id required.' }); }
  const scheme = await prisma.markScheme.findFirst({
    where: { id: mark_scheme_id, teacher_id: req.teacherId },
    include: { questions: { orderBy: { question_number: 'asc' } } },
  });
  if (!scheme) { cleanup(); return res.status(404).json({ error: 'Mark scheme not found' }); }
  const questions = scheme.questions.map(withAcceptedAnswers);
  const fileByQ = {};
  for (const f of files) { const m = f.fieldname.match(/question_(\d+)/); if (m) fileByQ[parseInt(m[1])] = f; }
  const missing = questions.filter(q => !fileByQ[q.question_number]);
  if (missing.length) { cleanup(); return res.status(400).json({ error: `Missing image for question${missing.length > 1 ? 's' : ''} ${missing.map(q => q.question_number).join(', ')}.` }); }
  if (!validateImageFiles(files)) { cleanup(); return res.status(400).json({ error: 'One or more files are not valid PNG, JPEG, or WEBP images.' }); }
  // Mock marking is scenario-driven demo data with no concept of a real uploaded answer —
  // for Maths and Science method questions it silently scores 0 every time, and for
  // rubric subjects it guesses from text length alone. Uploading a real image only
  // makes sense with real AI marking behind it.
  if (!process.env.ANTHROPIC_API_KEY) { cleanup(); return res.status(400).json({ error: 'Real AI marking required to mark uploaded images — set ANTHROPIC_API_KEY in backend/.env.' }); }
  const script = await prisma.script.create({
    data: { teacher_id: req.teacherId, student_name: student_name.trim(), mark_scheme_id, status: 'processing', total_marks_possible: scheme.total_marks, source: 'upload' },
  });
  try {
    const ocrResults = await Promise.all(questions.map(async q => {
      const file = fileByQ[q.question_number];
      const { text, confidence } = await extractTextFromImage(file.path, { markingType: q.marking_type });
      return { questionNumber: q.question_number, questionText: q.question_text, maxMarks: q.max_marks, markingType: q.marking_type, acceptedAnswers: q.accepted_answers || [], methodMarks: q.method_marks, answerMarks: q.answer_marks, ocrText: text || '(No text detected)', ocrConfidence: confidence, imagePath: `/uploads/${path.basename(file.path)}` };
    }));
    const totalAwarded = await processQuestions({ scriptId: script.id, subject: scheme.subject, ocrResults, isUpload: true });
    await prisma.script.update({ where: { id: script.id }, data: { status: 'review', total_marks_awarded: totalAwarded, processed_at: new Date() } });
  } catch (err) {
    await prisma.script.update({ where: { id: script.id }, data: { status: 'error' } });
    return res.status(500).json({ error: err.message });
  }
  res.status(201).json(await prisma.script.findUnique({ where: { id: script.id } }));
});

module.exports = router;
