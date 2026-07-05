// SQLite has no native array/list column type, so accepted_answers is stored as a JSON
// string. These helpers keep every route's array <-> string boundary in one place.
function toAcceptedAnswersJson(arr) { return JSON.stringify(arr || []); }
function withAcceptedAnswers(record) {
  if (!record) return record;
  let accepted_answers = [];
  try { accepted_answers = JSON.parse(record.accepted_answers || '[]'); } catch { accepted_answers = []; }
  return { ...record, accepted_answers };
}
module.exports = { toAcceptedAnswersJson, withAcceptedAnswers };
