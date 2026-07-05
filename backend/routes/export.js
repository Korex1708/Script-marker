const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

// GET /api/export/csv?scheme_id=xxx  → CSV of all scripts for a scheme
// GET /api/export/csv                → CSV of all completed scripts
router.get('/csv', async (req, res) => {
  const { scheme_id } = req.query;
  const scripts = (await prisma.script.findMany({
    where: { teacher_id: req.teacherId, status: 'complete', ...(scheme_id ? { mark_scheme_id: scheme_id } : {}) },
    include: { mark_scheme: true, answers: { include: { result: true }, orderBy: { question_number: 'asc' } } },
  })).sort((a, b) => a.student_name.localeCompare(b.student_name));

  if (scripts.length === 0) {
    return res.status(404).json({ error: 'No completed scripts found.' });
  }

  function buildRow(s) {
    const qMarks = s.answers.map(a => a.result ? a.result.final_marks : '');
    const pct = s.total_marks_possible > 0 ? Math.round((s.total_marks_awarded / s.total_marks_possible) * 100) : 0;
    return [
      `"${s.student_name.replace(/"/g, '""')}"`,
      `"${(s.mark_scheme?.title || '').replace(/"/g, '""')}"`,
      new Date(s.submitted_at).toLocaleDateString('en-GB'),
      ...qMarks,
      s.total_marks_awarded,
      s.total_marks_possible,
      `${pct}%`,
    ].join(',');
  }

  // Different mark schemes have different question sets, so a single header row built from
  // one script would misalign columns for every other scheme — group and header per scheme.
  const schemeOrder = [];
  const byScheme = {};
  for (const s of scripts) {
    if (!byScheme[s.mark_scheme_id]) { byScheme[s.mark_scheme_id] = []; schemeOrder.push(s.mark_scheme_id); }
    byScheme[s.mark_scheme_id].push(s);
  }

  const blocks = schemeOrder.map(schemeId => {
    const group = byScheme[schemeId];
    const qHeaders = group[0].answers.map(a => `Q${a.question_number} (/${a.max_marks})`);
    const header = ['Student Name', 'Mark Scheme', 'Date Submitted', ...qHeaders, 'Total', 'Max', 'Percentage'].join(',');
    return [header, ...group.map(buildRow)].join('\n');
  });

  const csv = blocks.join('\n\n');
  const filename = scheme_id
    ? `${((await prisma.markScheme.findUnique({ where: { id: scheme_id } }))?.title || 'export').replace(/[^a-z0-9]/gi, '_')}.csv`
    : 'scriptmark_results.csv';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// GET /api/export/report/:scriptId → printable HTML report for one student
router.get('/report/:scriptId', async (req, res) => {
  const script = await prisma.script.findFirst({
    where: { id: req.params.scriptId, teacher_id: req.teacherId },
    include: { mark_scheme: true, answers: { include: { result: true }, orderBy: { question_number: 'asc' } } },
  });
  if (!script) return res.status(404).json({ error: 'Script not found' });

  const scheme = script.mark_scheme;
  const pct = script.total_marks_possible > 0 ? Math.round((script.total_marks_awarded / script.total_marks_possible) * 100) : 0;

  const qRows = script.answers.map(a => {
    const r = a.result;
    const marks = r ? r.final_marks : '–';
    const overridden = r?.override_marks != null;
    return `
      <tr>
        <td>Q${a.question_number}</td>
        <td>${escHtml(a.question_text)}</td>
        <td style="text-align:center">${marks}/${a.max_marks}${overridden ? ' ✎' : ''}</td>
        <td style="color:#555;font-size:0.85em">${r ? escHtml(r.feedback) : '–'}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ScriptMark Report — ${escHtml(script.student_name)}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a1a18; }
  h1 { font-size: 1.6rem; margin-bottom: 0.2rem; }
  .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
  .score { font-size: 2.5rem; font-weight: bold; color: #20262B; }
  .score span { font-size: 1rem; color: #888; font-weight: normal; }
  table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  th { text-align: left; padding: 8px 10px; background: #f0efe9; border-bottom: 2px solid #ccc; font-size: 0.85rem; }
  td { padding: 10px; border-bottom: 1px solid #e0dfd8; vertical-align: top; }
  td:first-child { white-space: nowrap; font-weight: bold; width: 40px; }
  td:nth-child(3) { white-space: nowrap; width: 80px; }
  .footer { margin-top: 2rem; font-size: 0.78rem; color: #999; border-top: 1px solid #eee; padding-top: 1rem; }
  @media print { .footer { page-break-before: avoid; } }
</style>
</head>
<body>
<h1>${escHtml(script.student_name)}</h1>
<div class="meta">
  ${escHtml(scheme?.title || '')} &nbsp;·&nbsp; ${escHtml(scheme?.subject || '')}
  &nbsp;·&nbsp; Submitted ${new Date(script.submitted_at).toLocaleDateString('en-GB')}
</div>
<div class="score">${script.total_marks_awarded}/${script.total_marks_possible} <span>(${pct}%)</span></div>

<table>
  <thead><tr><th>Q</th><th>Question</th><th>Mark</th><th>Feedback</th></tr></thead>
  <tbody>${qRows}</tbody>
</table>

<div class="footer">
  Generated by ScriptMark &nbsp;·&nbsp; Marks may have been reviewed and adjusted by a teacher.
  ✎ = teacher override applied.
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
