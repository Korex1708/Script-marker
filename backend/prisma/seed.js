const bcrypt = require('bcryptjs');
const prisma = require('../db/prisma');
const { toAcceptedAnswersJson } = require('../db/serialize');

async function seed() {
  const teacherCount = await prisma.teacher.count();
  if (teacherCount > 0) return;

  const teacher = await prisma.teacher.create({
    data: { name: 'Demo Teacher', email: 'demo@scriptmark.local', password_hash: bcrypt.hashSync('demo1234', 10) },
  });

  async function createScheme(title, subject, questions) {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    await prisma.markScheme.create({
      data: {
        teacher_id: teacher.id, title, subject, total_marks: totalMarks,
        questions: {
          create: questions.map(q => ({
            question_number: q.num, question_text: q.text, max_marks: q.marks,
            marking_type: q.type, method_marks: q.method ?? null, answer_marks: q.answer ?? null,
            accepted_answers: toAcceptedAnswersJson(q.accepted),
          })),
        },
      },
    });
  }

  await createScheme('English Language — Reading Section A', 'English', [
    { num: 1, text: 'What is the main theme of the passage? Use evidence from the text.', marks: 4, type: 'rubric' },
    { num: 2, text: 'How does the writer use language to create tension in lines 12–20? (PEE)', marks: 6, type: 'rubric' },
    { num: 3, text: 'Identify THREE structural features and explain the effect of each.', marks: 6, type: 'rubric' },
    { num: 4, text: 'How does the writer present the main character throughout the passage?', marks: 4, type: 'rubric' },
  ]);

  await createScheme('English Literature — Of Mice and Men', 'English', [
    { num: 1, text: 'How does Steinbeck present the theme of loneliness in the novel?', marks: 10, type: 'rubric' },
    { num: 2, text: 'How does Steinbeck present the relationship between George and Lennie?', marks: 10, type: 'rubric' },
    { num: 3, text: "How does Steinbeck present the character of Curley's wife?", marks: 10, type: 'rubric' },
  ]);

  await createScheme('Mathematics — Algebra Foundations', 'Mathematics', [
    { num: 1, text: 'Solve 3x + 7 = 22. Show your working.', marks: 3, type: 'method_and_answer', method: 2, answer: 1 },
    { num: 2, text: 'Make x the subject of y = 4x − 9.', marks: 3, type: 'method_and_answer', method: 2, answer: 1 },
    { num: 3, text: 'Expand and simplify (x + 5)(x − 3).', marks: 4, type: 'method_and_answer', method: 3, answer: 1 },
    { num: 4, text: 'A rectangle has length (x + 4) cm, width x cm, area 60 cm². Find x.', marks: 3, type: 'method_and_answer', method: 2, answer: 1 },
  ]);

  await createScheme('Chemistry — Bonding and Structure', 'Chemistry', [
    { num: 1, text: 'State the type of bonding in sodium chloride.', marks: 1, type: 'exact_match', accepted: ['ionic bonding', 'ionic'] },
    { num: 2, text: 'Describe ionic bonding. (2 marks)', marks: 2, type: 'rubric' },
    { num: 3, text: 'What is the formula of sulfuric acid?', marks: 1, type: 'exact_match', accepted: ['h2so4', 'H₂SO₄', 'H2SO4'] },
    { num: 4, text: 'State TWO properties of giant ionic structures.', marks: 2, type: 'multi_accept', accepted: ['high melting point', 'conducts electricity when molten', 'conducts electricity when dissolved', 'soluble in water', 'brittle', 'hard'] },
    { num: 5, text: 'Explain why sodium chloride has a high melting point. (3 marks)', marks: 3, type: 'rubric' },
    { num: 6, text: 'How many electrons does carbon have in its outer shell?', marks: 1, type: 'exact_match', accepted: ['4', 'four'] },
    { num: 7, text: 'State the name of the bonding in diamond.', marks: 1, type: 'exact_match', accepted: ['covalent bonding', 'covalent', 'giant covalent'] },
    { num: 8, text: 'Give ONE reason why graphite conducts electricity.', marks: 1, type: 'multi_accept', accepted: ['delocalised electrons', 'free electrons', 'electrons are free to move'] },
    { num: 9, text: 'Calculate the Mr of CaCO₃. (Ca=40, C=12, O=16)', marks: 2, type: 'method_and_answer', method: 1, answer: 1 },
    { num: 10, text: 'Describe the structure of a simple molecule.', marks: 2, type: 'rubric' },
  ]);

  await createScheme('Physics — Forces and Motion', 'Physics', [
    { num: 1, text: 'State Newton\'s Second Law of Motion.', marks: 1, type: 'multi_accept', accepted: ['force equals mass times acceleration', 'f = ma', 'F=ma', 'resultant force is proportional to acceleration'] },
    { num: 2, text: 'Calculate the force on a 5 kg object accelerating at 3 m/s². Show working.', marks: 2, type: 'method_and_answer', method: 1, answer: 1 },
    { num: 3, text: 'What is the unit of force?', marks: 1, type: 'exact_match', accepted: ['newton', 'newtons', 'N'] },
    { num: 4, text: 'Describe the motion of an object when resultant force is zero.', marks: 2, type: 'multi_accept', accepted: ['constant velocity', 'uniform speed', 'stationary or moving at constant speed', 'no acceleration'] },
    { num: 5, text: 'A car of mass 1200 kg decelerates at 4 m/s². Calculate the braking force. Show working.', marks: 2, type: 'method_and_answer', method: 1, answer: 1 },
    { num: 6, text: 'State the difference between mass and weight.', marks: 2, type: 'rubric' },
    { num: 7, text: 'What is the SI unit of mass?', marks: 1, type: 'exact_match', accepted: ['kilogram', 'kg'] },
    { num: 8, text: 'Give ONE factor that affects the stopping distance of a car.', marks: 1, type: 'multi_accept', accepted: ['speed', 'road condition', 'tyre condition', 'brake condition', 'reaction time', 'weather', 'mass'] },
    { num: 9, text: 'A velocity-time graph has a horizontal line. What does this show?', marks: 1, type: 'multi_accept', accepted: ['constant velocity', 'uniform speed', 'zero acceleration', 'no acceleration'] },
    { num: 10, text: 'Calculate the acceleration of an object that goes from 0 m/s to 20 m/s in 5 s.', marks: 1, type: 'exact_match', accepted: ['4', '4 m/s2', '4 m/s²', '4ms-2'] },
  ]);

  console.log('Sample data seeded — demo login: demo@scriptmark.local / demo1234');
}

module.exports = { seed };

if (require.main === module) {
  seed().then(() => prisma.$disconnect()).catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });
}
