const path = require('path');
const { createWorker } = require('tesseract.js');
const CACHE = path.join(__dirname, '..', 'data', 'tesseract-cache');

function withTimeout(p, ms, msg) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(msg)), ms))]); }

async function extractTextFromImage(filePath) {
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
module.exports = { extractTextFromImage };
