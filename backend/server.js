require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const prisma = require('./db/prisma');
const { seed } = require('./prisma/seed');
const { requireAuth, requireStudentAuth } = require('./middleware/auth');

function lanAddress() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Render (and any platform load balancer/CDN in front of it) sits between the client and
// this process, adding an X-Forwarded-For header — without this, express-rate-limit
// throws on every request to a rate-limited route instead of reading the real client IP.
app.set('trust proxy', 1);

// CORS_ORIGIN restricts requests to a specific frontend origin (e.g. a Vercel deployment
// split from this backend) — unset/development defaults to allowing any origin.
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : {}));
app.use(express.json());
const up = path.join(__dirname, 'uploads');
fs.mkdirSync(up, { recursive: true });
app.use('/uploads', express.static(up));

async function start() {
  await seed();

  // Sweep orphaned 'processing' scripts — any script still processing on startup
  // was interrupted mid-request (crash, restart, kill) and can never complete on its own.
  const { count } = await prisma.script.updateMany({ where: { status: 'processing' }, data: { status: 'error' } });
  if (count) console.log(`Marked ${count} orphaned script(s) as error.`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sentra Merit running on http://localhost:${PORT}`);
    const lan = lanAddress();
    if (lan) console.log(`On your local network, teachers can reach it at: http://${lan}:${PORT}`);
    console.log(`AI: ${process.env.ANTHROPIC_API_KEY ? 'Anthropic API (real)' : 'mock — add ANTHROPIC_API_KEY in backend/.env for real marking'}`);
  });
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/mark-schemes', requireAuth, require('./routes/markSchemes'));
app.use('/api/scripts', requireAuth, require('./routes/scripts'));
app.use('/api/results', requireAuth, require('./routes/results'));
app.use('/api/export', requireAuth, require('./routes/export'));
app.use('/api/feedback', requireAuth, require('./routes/feedback'));
app.use('/api/student-auth', require('./routes/studentAuth'));
app.use('/api/student', requireStudentAuth, require('./routes/student'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', timestamp: new Date().toISOString(),
  aiProvider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'mock',
  ocrProvider: process.env.GOOGLE_VISION_API_KEY ? 'google-vision' : 'tesseract',
  mathpixEnabled: !!(process.env.MATHPIX_API_ID && process.env.MATHPIX_API_KEY),
}));

// Serve the built frontend from this same server/port, so there's one process and one
// URL to share with pilot teachers instead of running the Vite dev server separately.
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else {
  console.log('No frontend build found at frontend/dist — run `npm run build` in frontend/ to serve the app from this port.');
}

// Safety net — a failed OCR call in a worker thread can otherwise crash the whole server.
process.on('uncaughtException', err => console.error('Uncaught exception (server staying up):', err.message));
process.on('unhandledRejection', err => console.error('Unhandled rejection (server staying up):', err));

start();
