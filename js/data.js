/* ============================================================
   data.js — All static data: criteria, conditions, examples
   ============================================================ */

const CRITERIA = [
  {
    id: 'design_logic',
    name: 'Design Logic',
    weight: 1.25,
    lo: 'Reward mechanics (points, badges, stars) drive engagement',
    hi: 'Learning objectives are inseparable from core gameplay mechanics',
  },
  {
    id: 'cognitive_demand',
    name: 'Cognitive Demand',
    weight: 1.0,
    lo: 'Surface-level interaction: tap, select, repeat',
    hi: 'Deep, immersive problem-solving and systems thinking',
  },
  {
    id: 'failure_function',
    name: 'Failure Function',
    weight: 1.25,
    lo: 'Failure is penalizing (lose points, no explanation)',
    hi: 'Failure is productive (feedback reveals conceptual errors)',
  },
  {
    id: 'learning_depth',
    name: 'Learning Depth',
    weight: 1.25,
    lo: 'Content exists independently; game is a motivation layer',
    hi: 'Knowledge is embedded in the system; cannot succeed without understanding',
  },
  {
    id: 'transfer_evidence',
    name: 'Transfer Evidence',
    weight: 1.0,
    lo: 'No evidence of skill transfer to real-world contexts',
    hi: 'Peer-reviewed studies demonstrate transfer to novel problems',
  },
];

const CONDITIONS = [
  {
    id: 'learning_integrity',
    name: 'Learning Integrity',
    desc: 'Learning objectives clearly drive design',
  },
  {
    id: 'teacher_expertise',
    name: 'Teacher Expertise',
    desc: 'Teachers receive pedagogical integration training',
  },
  {
    id: 'rigorous_assessment',
    name: 'Rigorous Assessment',
    desc: 'Outcomes measure transfer, not just in-game performance',
  },
  {
    id: 'developmental_balance',
    name: 'Developmental Balance',
    desc: 'Screen time stays within healthy pediatric guidelines',
  },
  {
    id: 'equitable_infrastructure',
    name: 'Equitable Infrastructure',
    desc: 'Devices, connectivity, and support are reliably available',
  },
];

const EXAMPLES = [
  {
    key: 'dragonbox',
    label: 'DragonBox Algebra',
    gameName: 'DragonBox (Algebra)',
    scores: [4.8, 4.5, 4.0, 4.7, 2.5],
    conditions: [true, false, false, true, true],
    notes: 'Strong design integrity but weak transfer evidence in controlled studies.',
  },
  {
    key: 'minecraft',
    label: 'Minecraft Education',
    gameName: 'Minecraft Education Edition',
    scores: [4.0, 4.2, 3.8, 3.9, 2.8],
    conditions: [true, false, false, true, false],
    notes: 'Promising but methodologically weak evidence base.',
  },
  {
    key: 'mathquiz',
    label: 'Math Quiz App',
    gameName: 'Math Quiz App (Points & Stars)',
    scores: [1.5, 1.8, 1.2, 1.5, 1.0],
    conditions: [false, false, false, true, true],
    notes: 'Classic gamification.',
  },
];

// Export as globals for vanilla JS (no module bundler)
window.SGDF = window.SGDF || {};
window.SGDF.CRITERIA = CRITERIA;
window.SGDF.CONDITIONS = CONDITIONS;
window.SGDF.EXAMPLES = EXAMPLES;