/* ============================================================
   scoring.js — Pure scoring logic: no DOM references
   ============================================================ */

window.SGDF = window.SGDF || {};

/**
 * Compute weighted average score.
 * @param {number[]} scores  - Raw scores (1.0–5.0) per criterion
 * @param {Object[]} criteria - Criteria objects with .weight
 * @returns {number} Weighted average, rounded to 2dp
 */
function computeWeightedScore(scores, criteria) {
  let numerator = 0;
  let denominator = 0;
  scores.forEach((s, i) => {
    numerator += s * criteria[i].weight;
    denominator += criteria[i].weight;
  });
  return Math.round((numerator / denominator) * 100) / 100;
}

/**
 * Derive verdict category from weighted score.
 * @param {number} score
 * @returns {{ label: string, key: string, cssClass: string }}
 */
function getVerdict(score) {
  if (score >= 4.0) {
    return { label: 'Serious Game', key: 'serious', cssClass: 'serious' };
  } else if (score >= 3.0) {
    return { label: 'Hybrid / Conditional', key: 'hybrid', cssClass: 'hybrid' };
  } else {
    return { label: 'Gamification', key: 'gamification', cssClass: 'gamification' };
  }
}

/**
 * Score bar fill colour pair based on verdict.
 */
function getScoreBarColors(verdict) {
  const map = {
    serious:      ['#00c853', '#69f0ae'],
    hybrid:       ['#e65100', '#ffb300'],
    gamification: ['#b71c1c', '#ff5252'],
  };
  return map[verdict.key] || ['#ffd700', '#ffd700'];
}

/**
 * Score-to-colour gradient for criterion mini-bars.
 */
function criterionColor(score) {
  if (score >= 4.0) return '#00c853';
  if (score >= 3.0) return '#ffb300';
  return '#ff5252';
}

/**
 * Build the plain-text copy report.
 */
function buildTextReport({ gameName, score, verdict, scores, criteria, conditions, conditionDefs, notes }) {
  const line = '─'.repeat(56);
  let out = [];
  out.push('SERIOUS GAME DIAGNOSTIC FRAMEWORK');
  out.push(line);
  out.push(`DIAGNOSTIC REPORT: ${gameName.toUpperCase()}`);
  out.push(line);
  out.push('');
  out.push(`Weighted Score: ${score} / 5.0`);
  out.push(`Verdict: ${verdict.label.toUpperCase()}`);
  out.push('');
  out.push('CRITERION BREAKDOWN');
  out.push(line);
  criteria.forEach((c, i) => {
    const bar = '█'.repeat(Math.round(scores[i] * 2)) + '░'.repeat(10 - Math.round(scores[i] * 2));
    out.push(`${c.name.padEnd(20)} ${bar}  ${scores[i].toFixed(1)}  (×${c.weight})`);
  });
  out.push('');
  out.push('NON-NEGOTIABLE CONDITIONS');
  out.push(line);
  conditionDefs.forEach((cd, i) => {
    const sym = conditions[i] ? '✓' : '✗';
    out.push(`${sym}  ${cd.name}: ${cd.desc}`);
  });
  out.push('');
  out.push('CONCLUSION');
  out.push(line);
  out.push(buildConclusionText({ gameName, score, verdict, conditions, conditionDefs, notes }));
  out.push('');
  out.push(line);
  out.push('Group 24 | Serious Games Seminar');
  return out.join('\n');
}

/**
 * Build the dynamic conclusion paragraph.
 */
function buildConclusionText({ gameName, score, verdict, conditions, conditionDefs, notes }) {
  const unmet = conditionDefs.filter((_, i) => !conditions[i]).map(c => c.name);

  const classDesc = {
    serious: `qualifies as a Serious Game—its design logic is fundamentally oriented toward learning, not merely toward engagement or motivation`,
    hybrid: `occupies a hybrid position. While it demonstrates meaningful integration of learning and gameplay in some dimensions, it falls short of the full coherence expected of a Serious Game`,
    gamification: `is best classified as Gamification. Its core mechanics prioritize engagement signals—points, rewards, and progression—rather than embedding knowledge within gameplay itself`,
  };

  let text = `${gameName} achieves a weighted diagnostic score of ${score}/5.0 and ${classDesc[verdict.key]}.`;

  if (unmet.length > 0) {
    const listStr = unmet.length === 1
      ? unmet[0]
      : unmet.slice(0, -1).join(', ') + ', and ' + unmet[unmet.length - 1];
    text += ` Critically, the following non-negotiable conditions remain unmet: ${listStr}. Without these systemic supports, even a high-scoring game risks becoming pedagogically inert in real classroom contexts.`;
  } else {
    text += ` Notably, all five non-negotiable conditions are met, suggesting strong contextual readiness for deployment.`;
  }

  if (notes && notes.trim()) {
    text += ` Additional context: ${notes.trim()}`;
  }

  text += ` The question is not whether ${gameName} is 'good' or 'bad,' but whether its design logic produces learning or merely the appearance of learning.`;

  return text;
}

window.SGDF.computeWeightedScore = computeWeightedScore;
window.SGDF.getVerdict = getVerdict;
window.SGDF.getScoreBarColors = getScoreBarColors;
window.SGDF.criterionColor = criterionColor;
window.SGDF.buildTextReport = buildTextReport;
window.SGDF.buildConclusionText = buildConclusionText;