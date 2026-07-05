const { computeMathsFlag } = require('./flagging');
const fb = {
  full: ['Full marks — method correct and clearly shown, final answer matches.', 'Excellent. Working set out logically step by step, final answer correct.'],
  method_only: ['Method correct and earns full method marks, but a slip in the final step loses the answer mark.', 'Valid method — the error is purely arithmetic at the last step.'],
  answer_only: ['Correct answer, but no working shown. Method marks withheld as per the scheme.', "Correct answer with no method shown — can't confirm this wasn't a calculator shortcut, so method marks withheld."],
  none: ["The approach doesn't lead to a valid method. No marks awarded.", 'Invalid method for this question — no marks can be awarded under the scheme.'],
};
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function extractEvidence(text) { const lines = text.split('\n').map(l => l.trim()).filter(Boolean); return lines[lines.length - 1] || text.slice(0, 120); }

function mockMarkMathsAnswer(questionText, ocrEntry) {
  const { scenario, methodMarks, answerMarks, ocrConfidence } = ocrEntry;
  const mA = scenario === 'full' || scenario === 'method_only' ? methodMarks : 0;
  const aA = scenario === 'full' ? answerMarks : scenario === 'answer_only' ? answerMarks : 0;
  const aiConfidence = parseFloat((0.74 + Math.random() * 0.23).toFixed(2));
  const flagReason = computeMathsFlag({ ocrConfidence, aiConfidence, methodAwarded: mA, answerAwarded: aA, answerMarks });
  return { marksAwarded: mA + aA, methodAwarded: mA, answerAwarded: aA, feedback: pick(fb[scenario]), aiConfidence, evidence: extractEvidence(ocrEntry.ocrText), flagReason };
}
module.exports = { mockMarkMathsAnswer };
