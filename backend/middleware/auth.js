const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Falling back to a hardcoded secret means anyone can forge tokens for any teacher —
// generate and persist a random one locally instead if JWT_SECRET isn't configured.
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = path.join(__dirname, '..', 'data', '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {}
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  } catch {}
  console.warn('JWT_SECRET not set in backend/.env — generated a random secret for this instance (saved to backend/data/.jwt-secret). Set JWT_SECRET explicitly before deploying to production.');
  return generated;
}
const SECRET = resolveSecret();

// Checking the claim's presence (not just that the token verifies) matters once student
// tokens exist too — otherwise a student token would decode fine, req.teacherId would be
// undefined, and Prisma treats `where: { teacher_id: undefined }` as "no filter at all",
// silently returning every teacher's data instead of erroring.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in. Please log in to continue.' });
  try {
    const payload = jwt.verify(token, SECRET);
    if (!payload.teacherId) throw new Error('not a teacher token');
    req.teacherId = payload.teacherId;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

function requireStudentAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in. Please log in to continue.' });
  try {
    const payload = jwt.verify(token, SECRET);
    if (!payload.studentId) throw new Error('not a student token');
    req.studentId = payload.studentId;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

function signToken(teacherId) {
  return jwt.sign({ teacherId }, SECRET, { expiresIn: '30d' });
}
function signStudentToken(studentId) {
  return jwt.sign({ studentId }, SECRET, { expiresIn: '30d' });
}

module.exports = { requireAuth, signToken, requireStudentAuth, signStudentToken };
