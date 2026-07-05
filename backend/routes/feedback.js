const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

router.post('/', async (req, res) => {
  const { message, page } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Feedback message required.' });
  await prisma.feedback.create({ data: { teacher_id: req.teacherId, message: message.trim().slice(0, 4000), page: page || null } });
  res.status(201).json({ success: true });
});

module.exports = router;
