const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const { signStudentToken, requireStudentAuth } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password, join_code } = req.body;
  if (!name || !email || !password || !join_code) return res.status(400).json({ error: 'Name, email, password, and your teacher\'s join code are all required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const teacher = await prisma.teacher.findUnique({ where: { join_code: join_code.trim().toUpperCase() } });
  if (!teacher) return res.status(404).json({ error: 'That join code doesn\'t match any teacher — check it with them.' });
  const norm = email.trim().toLowerCase();
  if (await prisma.student.findUnique({ where: { email: norm } })) return res.status(409).json({ error: 'An account with that email already exists.' });
  const student = await prisma.student.create({
    data: { teacher_id: teacher.id, name: name.trim(), email: norm, password_hash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({ token: signStudentToken(student.id), student: { id: student.id, name: student.name, email: student.email } });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  const s = await prisma.student.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!s || !(await bcrypt.compare(password, s.password_hash))) return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json({ token: signStudentToken(s.id), student: { id: s.id, name: s.name, email: s.email } });
});

router.get('/me', requireStudentAuth, async (req, res) => {
  const s = await prisma.student.findUnique({ where: { id: req.studentId } });
  if (!s) return res.status(404).json({ error: 'Account not found.' });
  res.json({ id: s.id, name: s.name, email: s.email });
});

module.exports = router;
