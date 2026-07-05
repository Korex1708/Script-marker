const answerSets = [
  [
    "The main theme of the passage is survival and resilience. The writer conveys this through the protagonist's refusal to give up despite overwhelming odds. For example, the phrase 'he gripped the rope with bleeding hands, refusing to let go' emphasises his determination. This suggests the human spirit can endure extreme hardship.",
    "The writer creates tension in lines 12-20 through short, fragmented sentences such as 'He ran. He stopped. He listened.' This staccato rhythm reflects the character's panicked state. The verb 'listened' is particularly effective as it implies something threatening is nearby, creating dramatic suspense.",
    "First, the writer uses an in medias res opening — beginning mid-action immediately immerses the reader. Second, a flashback in paragraph three interrupts the present action to reveal backstory. Third, a cyclical structure returns to the opening setting at the close, but the tone has shifted from fear to determination.",
    "The main character is presented as outwardly strong but internally vulnerable. The metaphor 'he was a fortress with a crumbling foundation' suggests his tough exterior hides emotional weakness. His clipped dialogue — always short, never revealing — further shows a man who has built walls to survive.",
  ],
  [
    "The passage explores memory and loss. The writer suggests the past can never be left behind, symbolised by the recurring photograph image. The simile 'it faded like an old wound that never heals' implies that forgetting is impossible, only painful adjustment.",
    "Tension is built through pathetic fallacy. 'The storm tore at the windows as she waited' links the turbulent weather to the character's inner turmoil. The violent verb 'tore' has aggressive connotations, implying something destructive is about to happen. The reader shares the character's dread.",
    "The writer uses a non-linear narrative — the story moves between past and present without warning, mirroring the protagonist's disoriented state. There is also a shift from third to first person at the climax, creating sudden intimacy. Finally, repetition of 'it was too late' builds inevitability.",
    "The protagonist is presented as isolated even when surrounded by others. Other characters talk about her in third person even when she is present. The simile 'she stood like a monument nobody visits anymore' emphasises her deep sense of abandonment.",
  ],
];

function mockOcrScript(scriptId, questions) {
  const set = answerSets[Math.floor(Math.random() * answerSets.length)];
  return questions.map((q, i) => ({
    questionNumber: q.question_number, questionText: q.question_text, maxMarks: q.max_marks,
    ocrText: set[i % set.length] || `Student answer for question ${i + 1}.`,
    ocrConfidence: parseFloat((0.81 + Math.random() * 0.17).toFixed(2)),
    markingType: q.marking_type || 'rubric',
    flagged: Math.random() < 0.07,
  }));
}

module.exports = { mockOcrScript };
