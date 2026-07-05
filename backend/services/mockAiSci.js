const { computeScienceFlag } = require('./flagging');

function normalise(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s\+\-\/=_²³]/g, '').replace(/\s+/g, ' ').trim();
}

function isAccepted(ocrText, acceptedAnswers) {
  const norm = normalise(ocrText);
  return (acceptedAnswers || []).some(a => {
    const na = normalise(a);
    return norm === na || norm.includes(na) || na.includes(norm);
  });
}

function countAccepted(ocrText, acceptedAnswers) {
  const lines = ocrText.split(/\n|,|;/).map(l => l.trim()).filter(Boolean);
  let count = 0;
  for (const line of lines) {
    if (isAccepted(line, acceptedAnswers)) count++;
  }
  return count;
}

const rubricFeedback = {
  high: ['Excellent. Points clearly made with accurate scientific terminology and good development.', 'Very good. Comprehensive answer with accurate detail and well-structured explanation.'],
  mid: ['Reasonable attempt. Key points made but explanation needs more development and precise terminology.', 'Good start. The scientific content is broadly correct but needs more detail to score full marks.'],
  low: ['Basic response. A relevant point is made but lacks scientific detail or accurate terminology.', 'Limited understanding shown. More precise scientific language needed throughout.'],
};
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function mockMarkSciAnswer(questionText, ocrEntry) {
  const { ocrText, scenario, markingType, acceptedAnswers, maxMarks, methodMarks, answerMarks, ocrConfidence = 0.9 } = ocrEntry;
  let marksAwarded = 0, methodAwarded = null, answerAwarded = null;
  let feedback, evidence;
  const aiConfidence = parseFloat((0.78 + Math.random() * 0.18).toFixed(2));

  if (markingType === 'exact_match') {
    const matched = isAccepted(ocrText, acceptedAnswers);
    marksAwarded = matched ? maxMarks : 0;
    feedback = matched
      ? `Correct. "${ocrText.trim()}" is an accepted answer.`
      : `Incorrect. "${ocrText.trim()}" is not an accepted answer. Check accepted answers in the mark scheme.`;
    evidence = ocrText.trim().slice(0, 80);
  } else if (markingType === 'multi_accept') {
    const matched = countAccepted(ocrText, acceptedAnswers);
    marksAwarded = Math.min(matched, maxMarks);
    feedback = matched === maxMarks
      ? `Full marks. ${matched} valid answer${matched > 1 ? 's' : ''} identified correctly.`
      : matched > 0
        ? `Partial credit. ${matched} of ${maxMarks} required answers are valid. Review against the full accepted answer list.`
        : 'No accepted answers identified. Review the student response against the mark scheme.';
    evidence = ocrText.trim().slice(0, 100);
  } else if (markingType === 'method_and_answer') {
    const mA = scenario === 'full' || scenario === 'method_only' ? (methodMarks || Math.ceil(maxMarks / 2)) : 0;
    const aA = scenario === 'full' ? (answerMarks || 1) : 0;
    methodAwarded = mA;
    answerAwarded = aA;
    marksAwarded = mA + aA;
    feedback = scenario === 'full' ? 'Full marks — valid method and correct final answer.' :
      scenario === 'method_only' ? 'Method correct but the final answer is wrong — method marks awarded.' :
      'No valid method shown; no marks awarded.';
    evidence = ocrText.split('\n').filter(Boolean).pop() || ocrText.slice(0, 80);
  } else {
    const len = ocrText.trim().length;
    const base = len > 200 ? 0.60 + Math.random() * 0.38 : len > 80 ? 0.35 + Math.random() * 0.35 : 0.10 + Math.random() * 0.28;
    marksAwarded = Math.min(Math.max(Math.round(maxMarks * base), 0), maxMarks);
    const ratio = marksAwarded / maxMarks;
    const band = ratio >= 0.67 ? 'high' : ratio >= 0.38 ? 'mid' : 'low';
    feedback = pick(rubricFeedback[band]);
    evidence = ocrText.split(/[.!?]/).find(s => s.trim().length > 10) || ocrText.slice(0, 80);
  }

  const flagReason = computeScienceFlag({ ocrConfidence, aiConfidence, marksAwarded, maxMarks, markingType });
  return { marksAwarded, methodAwarded, answerAwarded, feedback, aiConfidence, evidence: (evidence || '').trim(), flagReason };
}

module.exports = { mockMarkSciAnswer };
