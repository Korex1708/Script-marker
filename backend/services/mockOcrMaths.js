const bank = {
  1: { m: 2, a: 1, scenarios: { full: '3x + 7 = 22\n3x = 15\nx = 5', method_only: '3x + 7 = 22\n3x = 15\nx = 4', answer_only: 'x = 5', none: 'x = 22 + 7 - 3\nx = 26' } },
  2: { m: 2, a: 1, scenarios: { full: 'y = 4x - 9\ny + 9 = 4x\nx = (y + 9) / 4', method_only: 'y = 4x - 9\ny + 9 = 4x\nx = (y + 9) / 3', answer_only: 'x = (y + 9) / 4', none: 'x = y - 9 + 4\nx = y - 5' } },
  3: { m: 3, a: 1, scenarios: { full: '(x + 5)(x - 3)\n= x² - 3x + 5x - 15\n= x² + 2x - 15', method_only: '(x + 5)(x - 3)\n= x² + 2x - 16', answer_only: 'x² + 2x - 15', none: '(x + 5)(x - 3) = x² - 15' } },
  4: { m: 2, a: 1, scenarios: { full: 'x(x + 4) = 60\nx² + 4x - 60 = 0\n(x + 10)(x - 6) = 0\nx = 6', method_only: 'x² + 4x - 60 = 0\n(x + 10)(x - 6) = 0\nx = -10', answer_only: 'x = 6', none: 'x + 4 + x = 60\nx = 28' } },
};
function pickScenario() { const r = Math.random(); return r < 0.55 ? 'full' : r < 0.78 ? 'method_only' : r < 0.90 ? 'answer_only' : 'none'; }
function mockOcrMathsScript(questions) {
  return questions.map(q => {
    const s = pickScenario(); const b = bank[q.question_number];
    const methodMarks = b ? b.m : q.method_marks || Math.ceil(q.max_marks / 2);
    const answerMarks = b ? b.a : q.answer_marks || (q.max_marks - methodMarks);
    const ocrText = b ? b.scenarios[s] : `Step 1: Set up.\nStep 2: Solve.\nAnswer: ${Math.floor(Math.random() * 10) + 1}`;
    return { questionNumber: q.question_number, questionText: q.question_text, maxMarks: q.max_marks, methodMarks, answerMarks, scenario: s, markingType: 'method_and_answer', ocrText, ocrConfidence: parseFloat((0.82 + Math.random() * 0.16).toFixed(2)), flagged: Math.random() < 0.06 };
  });
}
module.exports = { mockOcrMathsScript };
