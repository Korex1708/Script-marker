const { mockMarkAnswer } = require('./mockAi');
const { mockMarkMathsAnswer } = require('./mockAiMaths');
const { mockMarkSciAnswer } = require('./mockAiSci');
const { markEnglishAnswer } = require('./aiEngine');
const { markMathsAnswer } = require('./aiEngineMaths');
const { markSciAnswer } = require('./aiEngineSci');

const useReal = () => !!process.env.ANTHROPIC_API_KEY;

async function markAnswer({ subject, questionText, ocrText, maxMarks, ocrConfidence, mockOcrEntry }) {
  const isMaths = subject === 'Mathematics';
  const isSci = subject === 'Chemistry' || subject === 'Physics';

  if (useReal()) {
    if (isMaths) return markMathsAnswer(questionText, { ocrText, methodMarks: mockOcrEntry?.methodMarks, answerMarks: mockOcrEntry?.answerMarks, ocrConfidence });
    if (isSci) return markSciAnswer(questionText, { ...mockOcrEntry, ocrText, ocrConfidence });
    return markEnglishAnswer(questionText, ocrText, maxMarks, ocrConfidence);
  }

  if (isMaths) {
    if (!mockOcrEntry) throw new Error('Real AI marking required for Maths uploads — set ANTHROPIC_API_KEY in backend/.env');
    return mockMarkMathsAnswer(questionText, mockOcrEntry);
  }
  if (isSci) return mockMarkSciAnswer(questionText, mockOcrEntry || { ocrText, markingType: 'rubric', acceptedAnswers: [], maxMarks, ocrConfidence });
  return mockMarkAnswer(questionText, ocrText, maxMarks, ocrConfidence);
}

module.exports = { markAnswer, useReal };
