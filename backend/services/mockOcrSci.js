// Science OCR simulation — for exact_match and multi_accept questions the key
// variable is whether the student wrote an accepted answer or a wrong one. For rubric
// and method_and_answer questions we delegate to the English and Maths mocks.

const chemistryBank = {
  1: { correct: 'ionic bonding', wrong: ['covalent bonding', 'metallic bonding', 'hydrogen bonding'] },
  3: { correct: 'H2SO4', wrong: ['H2SO3', 'HCl', 'H2O', 'HNO3'] },
  6: { correct: '4', wrong: ['2', '6', '8', '3'] },
  7: { correct: 'covalent bonding', wrong: ['ionic bonding', 'metallic bonding', 'hydrogen bonding'] },
};

const chemistryMultiBank = {
  4: {
    correct: ['high melting point', 'conducts electricity when molten', 'brittle'],
    wrong: ['low melting point', 'conducts electricity as solid', 'malleable'],
  },
  8: {
    correct: ['delocalised electrons', 'free electrons'],
    wrong: ['ionic bonds', 'strong covalent bonds', 'metallic bonds'],
  },
};

const physicsBank = {
  3: { correct: 'newton', wrong: ['joule', 'watt', 'pascal', 'kilogram'] },
  7: { correct: 'kilogram', wrong: ['gram', 'newton', 'pound', 'tonne'] },
  10: { correct: '4', wrong: ['5', '2.5', '3', '100'] },
};

const physicsMultiBank = {
  1: {
    correct: ['F = ma', 'force equals mass times acceleration'],
    wrong: ['F = mv', 'force equals mass times velocity', 'pressure equals force over area'],
  },
  4: {
    correct: ['constant velocity', 'zero acceleration'],
    wrong: ['accelerating', 'decelerating', 'moving in a circle'],
  },
  8: {
    correct: ['speed', 'tyre condition', 'road condition', 'reaction time'],
    wrong: ['colour of the car', 'engine size', 'number of passengers'],
  },
  9: {
    correct: ['constant velocity', 'zero acceleration', 'uniform speed'],
    wrong: ['speeding up', 'slowing down', 'accelerating'],
  },
};

const rubricAnswers = {
  chemistry: [
    "Ionic bonding involves the transfer of electrons from a metal to a non-metal. This creates oppositely charged ions which are held together by strong electrostatic attraction. For example, in NaCl, sodium loses one electron to form Na⁺ and chlorine gains one electron to form Cl⁻.",
    "Ionic compounds have high melting points because of the strong electrostatic forces between the oppositely charged ions. A lot of energy is needed to overcome these forces. The ions are arranged in a regular lattice structure which makes the compound hard and brittle.",
    "A simple molecule consists of two or more atoms joined by covalent bonds. The covalent bonds within the molecule are strong, but the intermolecular forces between molecules are weak. This means simple molecular substances have low melting points.",
  ],
  physics: [
    "Mass is the amount of matter in an object and is measured in kilograms. It does not change with location. Weight is the gravitational force acting on an object and is measured in newtons. Weight changes depending on the gravitational field strength.",
    "Stopping distance depends on both thinking distance and braking distance. Thinking distance increases with speed and reaction time. Braking distance increases with speed, poor road conditions, or worn tyres.",
  ],
};

function pickAnswer(bank, questionNumber, type) {
  const r = Math.random();
  const entry = bank[questionNumber];
  if (!entry) return null;

  if (type === 'exact_match') {
    // 65% correct, 35% wrong
    if (r < 0.65) return { text: entry.correct, scenario: 'correct' };
    return { text: entry.wrong[Math.floor(Math.random() * entry.wrong.length)], scenario: 'wrong' };
  }
  if (type === 'multi_accept') {
    // 70% give a correct answer, 30% wrong
    if (r < 0.70) {
      const ans = entry.correct[Math.floor(Math.random() * entry.correct.length)];
      // For 2-mark multi_accept, sometimes give only one correct answer (partial marks possible)
      if (r < 0.40) return { text: ans + '\n' + entry.correct[Math.floor(Math.random() * entry.correct.length)], scenario: 'correct' };
      return { text: ans, scenario: 'partial' };
    }
    return { text: entry.wrong[Math.floor(Math.random() * entry.wrong.length)], scenario: 'wrong' };
  }
  return null;
}

function mockOcrSciScript(questions, subject) {
  const isChemistry = subject === 'Chemistry';
  const exactBank = isChemistry ? chemistryBank : physicsBank;
  const multiBank = isChemistry ? chemistryMultiBank : physicsMultiBank;
  const rubricPool = rubricAnswers[isChemistry ? 'chemistry' : 'physics'];
  const calcPool = [
    'Step 1: Identify values\nStep 2: Apply formula\nAnswer: 100',
    '40 + 12 + 48 = 100',
    'Mr = 40 + 12 + (16 × 3) = 100',
    'F = ma\nF = 5 × 3\nF = 15 N',
    'a = (v - u) / t\na = (20 - 0) / 5\na = 4 m/s²',
  ];

  return questions.map((q, i) => {
    let ocrText;
    let scenario = 'rubric';

    if (q.marking_type === 'exact_match') {
      const ans = pickAnswer(exactBank, q.question_number, 'exact_match');
      ocrText = ans ? ans.text : (Math.random() < 0.65 ? 'covalent bonding' : 'I don\'t know');
      scenario = ans ? ans.scenario : 'wrong';
    } else if (q.marking_type === 'multi_accept') {
      const ans = pickAnswer(multiBank, q.question_number, 'multi_accept');
      ocrText = ans ? ans.text : rubricPool[i % rubricPool.length];
      scenario = ans ? ans.scenario : 'partial';
    } else if (q.marking_type === 'method_and_answer') {
      ocrText = calcPool[i % calcPool.length];
      scenario = Math.random() < 0.6 ? 'full' : 'method_only';
    } else {
      ocrText = rubricPool[i % rubricPool.length];
    }

    return {
      questionNumber: q.question_number, questionText: q.question_text, maxMarks: q.max_marks,
      markingType: q.marking_type, acceptedAnswers: q.accepted_answers || [],
      methodMarks: q.method_marks, answerMarks: q.answer_marks,
      ocrText, scenario,
      ocrConfidence: parseFloat((0.80 + Math.random() * 0.18).toFixed(2)),
    };
  });
}

module.exports = { mockOcrSciScript };
