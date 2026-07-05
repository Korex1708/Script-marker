function computeEnglishFlag({ ocrConfidence, aiConfidence, marksAwarded, maxMarks, spotCheckRate = 0.15 }) {
  const ratio = maxMarks > 0 ? marksAwarded / maxMarks : 0;
  const onBoundary = Math.abs(ratio - 0.5) < 0.08 || Math.abs(ratio - 0.67) < 0.06;
  if (ocrConfidence < 0.85) return 'low_ocr';
  if (aiConfidence < 0.78) return 'low_ai';
  if (onBoundary) return 'boundary';
  if (Math.random() < spotCheckRate) return 'spot_check';
  return null;
}

function computeMathsFlag({ ocrConfidence, aiConfidence, methodAwarded, answerAwarded, answerMarks, spotCheckRate = 0.15 }) {
  if (ocrConfidence < 0.85) return 'low_ocr';
  if (aiConfidence < 0.78) return 'low_ai';
  if (methodAwarded === 0 && answerMarks > 0 && answerAwarded === answerMarks) return 'method_mismatch';
  if (Math.random() < spotCheckRate) return 'spot_check';
  return null;
}

function computeScienceFlag({ ocrConfidence, aiConfidence, marksAwarded, maxMarks, markingType, spotCheckRate = 0.15 }) {
  if (ocrConfidence < 0.85) return 'low_ocr';
  if (aiConfidence < 0.78) return 'low_ai';
  // For exact-match questions the AI is very confident or completely not — a low
  // AI confidence here is more meaningful than on a rubric question, so we spot-check
  // more aggressively to catch cases where the OCR garbled a short answer.
  const rate = (markingType === 'exact_match' || markingType === 'multi_accept') ? 0.20 : spotCheckRate;
  if (Math.random() < rate) return 'spot_check';
  return null;
}

module.exports = { computeEnglishFlag, computeMathsFlag, computeScienceFlag };
