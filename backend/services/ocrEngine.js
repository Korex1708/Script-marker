const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const CACHE = path.join(__dirname, '..', 'data', 'tesseract-cache');

function withTimeout(p, ms, msg) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(msg)), ms))]); }

async function extractWithGoogleVision(filePath) {
  const key = process.env.GOOGLE_VISION_API_KEY;
  const base64 = fs.readFileSync(filePath).toString('base64');
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: base64 }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }),
  });
  if (!res.ok) throw new Error(`Google Vision API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const result = data.responses?.[0];
  if (result?.error) throw new Error(`Google Vision error: ${result.error.message}`);
  const annotation = result?.fullTextAnnotation;
  if (!annotation) return { text: '', confidence: 0 };
  const confidence = annotation.pages?.[0]?.confidence ?? 0.9;
  return { text: annotation.text.trim(), confidence: parseFloat(confidence.toFixed(2)) };
}

async function extractWithMathpix(filePath) {
  const base64 = fs.readFileSync(filePath).toString('base64');
  const ext = path.extname(filePath).replace('.', '').toLowerCase() || 'png';
  const res = await fetch('https://api.mathpix.com/v3/text', {
    method: 'POST',
    headers: { app_id: process.env.MATHPIX_API_ID, app_key: process.env.MATHPIX_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ src: `data:image/${ext};base64,${base64}` }),
  });
  if (!res.ok) throw new Error(`Mathpix API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data.error) throw new Error(`Mathpix error: ${data.error}`);
  return { text: (data.text || '').trim(), confidence: parseFloat((data.confidence ?? 0.9).toFixed(2)) };
}

async function extractWithTesseract(filePath) {
  let worker;
  try {
    worker = await withTimeout(createWorker('eng', 1, { cachePath: CACHE }), 45000, 'OCR setup timed out.');
    const { data } = await withTimeout(worker.recognize(filePath), 45000, 'OCR recognition timed out.');
    return { text: data.text.trim(), confidence: parseFloat((data.confidence / 100).toFixed(2)) };
  } catch (err) {
    if (err.message && err.message.includes('Network error')) throw new Error('OCR needs to download language data on first use but could not reach the network. Check internet access and try again.');
    throw err;
  } finally { if (worker) await worker.terminate().catch(() => {}); }
}

// Mathpix specialises in equations, so calculation questions try it first when configured.
// Google Vision handles handwriting generally better than Tesseract for everything else.
// Tesseract is the last resort so OCR never hard-fails just because a cloud key is unset —
// missing/failing cloud providers degrade quality rather than breaking the request.
async function extractTextFromImage(filePath, { markingType } = {}) {
  const isCalc = markingType === 'method_and_answer';
  if (isCalc && process.env.MATHPIX_API_ID && process.env.MATHPIX_API_KEY) {
    try { return await extractWithMathpix(filePath); }
    catch (err) { console.warn(`Mathpix OCR failed, falling back: ${err.message}`); }
  } else if (isCalc && (process.env.MATHPIX_API_ID || process.env.MATHPIX_API_KEY)) {
    console.warn('Mathpix needs BOTH MATHPIX_API_ID and MATHPIX_API_KEY set — only one is configured. Get both from mathpix.com/ocr. Falling back.');
  }
  if (process.env.GOOGLE_VISION_API_KEY) {
    try { return await extractWithGoogleVision(filePath); }
    catch (err) { console.warn(`Google Vision OCR failed, falling back to Tesseract: ${err.message}`); }
  } else {
    console.warn('GOOGLE_VISION_API_KEY not set — using Tesseract (lower accuracy on handwriting). Get a key at console.cloud.google.com (enable the Vision API, then create an API key).');
  }
  return extractWithTesseract(filePath);
}

module.exports = { extractTextFromImage };
