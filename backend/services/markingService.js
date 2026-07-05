const { mockMarkAnswer } = require('./mockAi');
const { mockMarkMathsAnswer } = require('./mockAiMaths');
const { mockMarkSciAnswer } = require('./mockAiSci');
const { markEnglishAnswer } = require('./aiEngine');
const { markMathsAnswer } = require('./aiEngineMaths');
const { markSciAnswer } = require('./aiEngineSci');

const useReal = () => !!process.env.ANTHROPIC_API_KEY;

// Simulated scripts are demo data with no real answer behind them — they must always use
// mock marking, even when a real API key is configured, otherwise "Simulated demo" mode
// (whose whole point is needing no real AI access) breaks the moment the key runs out of
// credits or hits a rate limit. Real image uploads always require real marking; the
// /scripts/upload route already refuses to accept uploads at all without a configured key.
async function markAnswer({ subject, questionText, ocrText, maxMarks, ocrConfidence, mockOcrEntry, isUpload }) {
  const isMaths = subject === 'Mathematics';
  const isSci = subject === 'Chemistry' || subject === 'Physics';

  if (isUpload) {
    if (isMaths) return markMathsAnswer(questionText, { ocrText, methodMarks: mockOcrEntry?.methodMarks, answerMarks: mockOcrEntry?.answerMarks, ocrConfidence });
    if (isSci) return markSciAnswer(questionText, { ...mockOcrEntry, ocrText, ocrConfidence });
    return markEnglishAnswer(questionText, ocrText, maxMarks, ocrConfidence);
  }

  if (isMaths) return mockMarkMathsAnswer(questionText, mockOcrEntry);
  if (isSci) return mockMarkSciAnswer(questionText, mockOcrEntry || { ocrText, markingType: 'rubric', acceptedAnswers: [], maxMarks, ocrConfidence });
  return mockMarkAnswer(questionText, ocrText, maxMarks, ocrConfidence);
}

module.exports = { markAnswer, useReal };
