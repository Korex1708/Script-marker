const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const { signToken, requireAuth } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const norm = email.trim().toLowerCase();
  if (await prisma.teacher.findUnique({ where: { email: norm } })) return res.status(409).json({ error: 'An account with that email already exists.' });
  const teacher = await prisma.teacher.create({
    data: { name: name.trim(), email: norm, password_hash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({ token: signToken(teacher.id), teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  const t = await prisma.teacher.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!t || !(await bcrypt.compare(password, t.password_hash))) return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json({ token: signToken(t.id), teacher: { id: t.id, name: t.name, email: t.email } });
});

router.get('/me', requireAuth, async (req, res) => {
  const t = await prisma.teacher.findUnique({ where: { id: req.teacherId } });
  if (!t) return res.status(404).json({ error: 'Account not found.' });
  res.json({ id: t.id, name: t.name, email: t.email });
});

module.exports = router;
