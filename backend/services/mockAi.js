const { computeEnglishFlag } = require('./flagging');

const feedback = {
  high: ["Excellent response. Clear identification with well-chosen textual evidence. Analysis is perceptive and well-developed.", "Very strong. Demonstrates sophisticated understanding with precise language choices. PEE structure consistently applied.", "Outstanding. Multiple techniques identified with detailed and convincing analysis."],
  mid: ["Good attempt. Point identified with some evidence, but analysis needs further development. Explore the writer's intention more explicitly.", "Reasonable response showing understanding. PEE structure partially applied but explanation section is underdeveloped.", "Some good ideas but they need more development. Link points back to the question more explicitly."],
  low: ["Basic response. A point is made but lacks textual support. Always quote directly from the passage.", "Shows limited understanding. The answer stays at the surface — think about WHY the writer made these choices.", "Incomplete. Address all parts of the question and support every point with a quotation."],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function extractEvidence(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const withQuote = sentences.find(s => s.includes("'") || s.includes('"'));
  const chosen = withQuote || sentences[Math.min(1, sentences.length - 1)] || text;
  return chosen.trim().length > 160 ? chosen.trim().slice(0, 157) + '…' : chosen.trim();
}

function mockMarkAnswer(questionText, ocrText, maxMarks, ocrConfidence = 1) {
  const len = ocrText.trim().length;
  let base = len > 320 ? 0.60 + Math.random() * 0.38 : len > 160 ? 0.36 + Math.random() * 0.34 : 0.08 + Math.random() * 0.30;
  const marksAwarded = Math.min(Math.max(Math.round(maxMarks * base), 0), maxMarks);
  const ratio = marksAwarded / maxMarks;
  const band = ratio >= 0.67 ? 'high' : ratio >= 0.38 ? 'mid' : 'low';
  const aiConfidence = parseFloat((0.68 + Math.random() * 0.28).toFixed(2));
  const flagReason = computeEnglishFlag({ ocrConfidence, aiConfidence, marksAwarded, maxMarks });
  return { marksAwarded, feedback: pick(feedback[band]), aiConfidence, evidence: extractEvidence(ocrText), flagReason };
}

module.exports = { mockMarkAnswer };
