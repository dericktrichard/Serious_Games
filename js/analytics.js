/* ============================================================
   analytics.js — Evaluation store + aggregate analysis
   Storage: localStorage key "sgdf_evaluations"
   No external libraries — charts drawn in SVG
   ============================================================ */

window.SGDF = window.SGDF || {};

const STORE_KEY = 'sgdf_evaluations';

/* ══════════════════════════════════════
   STORAGE API
══════════════════════════════════════ */

/** Load all stored evaluations (array). */
function loadEvaluations() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Persist a completed evaluation. */
function saveEvaluation({ gameName, score, verdict, scores, conditionsArr, notes }) {
  const all = loadEvaluations();
  const entry = {
    id:          Date.now(),
    ts:          new Date().toISOString(),
    gameName:    gameName.trim() || 'Unnamed Game',
    score,
    verdict:     verdict.key,
    verdictLabel:verdict.label,
    scores:      [...scores],
    conditions:  [...conditionsArr],
    notes:       notes || '',
  };
  all.push(entry);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('SGDF: localStorage quota exceeded', e);
  }
  return entry;
}

/** Delete a single evaluation by id. */
function deleteEvaluation(id) {
  const filtered = loadEvaluations().filter((e) => e.id !== id);
  localStorage.setItem(STORE_KEY, JSON.stringify(filtered));
}

/** Clear all evaluations. */
function clearAllEvaluations() {
  localStorage.removeItem(STORE_KEY);
}

/* ══════════════════════════════════════
   AGGREGATE STATS
══════════════════════════════════════ */

function computeAggregates(entries) {
  if (!entries.length) return null;

  const n = entries.length;

  // Verdict counts
  const verdictCounts = { serious: 0, hybrid: 0, gamification: 0 };
  entries.forEach((e) => { verdictCounts[e.verdict] = (verdictCounts[e.verdict] || 0) + 1; });

  // Average score
  const avgScore = entries.reduce((s, e) => s + e.score, 0) / n;

  // Per-criterion averages (5 criteria)
  const criteriaAvg = [0, 0, 0, 0, 0];
  entries.forEach((e) => {
    e.scores.forEach((s, i) => { criteriaAvg[i] += s; });
  });
  criteriaAvg.forEach((_, i) => { criteriaAvg[i] = Math.round((criteriaAvg[i] / n) * 100) / 100; });

  // Score distribution buckets: 1–2, 2–3, 3–4, 4–5
  const dist = [0, 0, 0, 0];
  entries.forEach((e) => {
    if (e.score < 2)      dist[0]++;
    else if (e.score < 3) dist[1]++;
    else if (e.score < 4) dist[2]++;
    else                  dist[3]++;
  });

  // Most evaluated games (by normalised name)
  const gameMap = {};
  entries.forEach((e) => {
    const k = e.gameName.toLowerCase().trim();
    if (!gameMap[k]) gameMap[k] = { name: e.gameName, count: 0, scoreSum: 0 };
    gameMap[k].count++;
    gameMap[k].scoreSum += e.score;
  });
  const topGames = Object.values(gameMap)
    .map((g) => ({ ...g, avgScore: Math.round((g.scoreSum / g.count) * 100) / 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { n, verdictCounts, avgScore, criteriaAvg, dist, topGames };
}

/* ══════════════════════════════════════
   ANALYTICS DASHBOARD RENDERER
══════════════════════════════════════ */

function renderAnalyticsDashboard(container, criteria) {
  const entries = loadEvaluations();
  const agg     = computeAggregates(entries);

  container.innerHTML = '';

  // ── Empty state ──
  if (!agg) {
    container.innerHTML = `
      <div class="an-empty">
        <div class="an-empty-icon">◎</div>
        <p class="an-empty-title">No evaluations yet</p>
        <p class="an-empty-sub">Complete an evaluation to see aggregate analytics here.</p>
      </div>`;
    return;
  }

  // ── Summary cards row ──
  const summaryHTML = `
    <div class="an-summary-row">
      ${statCard('Total Evaluations', agg.n, '')}
      ${statCard('Average Score', agg.avgScore.toFixed(2), '/ 5.00')}
      ${statCard('Serious Games', agg.verdictCounts.serious || 0, `${Math.round((agg.verdictCounts.serious||0)/agg.n*100)}%`)}
      ${statCard('Gamification', agg.verdictCounts.gamification || 0, `${Math.round((agg.verdictCounts.gamification||0)/agg.n*100)}%`)}
    </div>`;

  // ── Charts row ──
  const chartsHTML = `
    <div class="an-charts-row">
      <div class="an-chart-card">
        <div class="an-card-title">Verdict Distribution</div>
        ${donutSVG(agg.verdictCounts, agg.n)}
        <div class="an-donut-legend">
          <span class="dl-item serious">● Serious Game <em>${agg.verdictCounts.serious||0}</em></span>
          <span class="dl-item hybrid">● Hybrid <em>${agg.verdictCounts.hybrid||0}</em></span>
          <span class="dl-item gamification">● Gamification <em>${agg.verdictCounts.gamification||0}</em></span>
        </div>
      </div>
      <div class="an-chart-card">
        <div class="an-card-title">Average Criterion Scores</div>
        ${criteriaBarsSVG(agg.criteriaAvg, criteria)}
      </div>
      <div class="an-chart-card">
        <div class="an-card-title">Score Distribution</div>
        ${distributionSVG(agg.dist, agg.n)}
      </div>
    </div>`;

  // ── Top games ──
  const topHTML = agg.topGames.length ? `
    <div class="an-section-title">Most Evaluated Games</div>
    <div class="an-top-games">
      ${agg.topGames.map((g) => `
        <div class="an-top-row">
          <span class="an-top-name">${escA(g.name)}</span>
          <div class="an-top-bar-wrap">
            <div class="an-top-bar" style="width:${((g.avgScore-1)/4*100).toFixed(1)}%;background:${verdictColor(g.avgScore)}"></div>
          </div>
          <span class="an-top-score">${g.avgScore.toFixed(2)}</span>
          <span class="an-top-count">${g.count}×</span>
        </div>`).join('')}
    </div>` : '';

  // ── Evaluations table ──
  const tableRows = [...entries].reverse().map((e) => `
    <tr>
      <td>${escA(e.gameName)}</td>
      <td><span class="vtag ${e.verdict}">${e.verdictLabel}</span></td>
      <td class="td-score">${e.score.toFixed(2)}</td>
      <td class="td-date">${formatDate(e.ts)}</td>
      <td><button class="btn-del-row" data-id="${e.id}" title="Delete">✕</button></td>
    </tr>`).join('');

  const tableHTML = `
    <div class="an-section-title">All Evaluations
      <button class="btn-clear-all" id="btn-clear-all">Clear All</button>
    </div>
    <div class="an-table-wrap">
      <table class="an-table">
        <thead><tr>
          <th>Game</th><th>Verdict</th><th>Score</th><th>Date</th><th></th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  container.innerHTML = summaryHTML + chartsHTML + topHTML + tableHTML;

  // Wire delete buttons
  container.querySelectorAll('.btn-del-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteEvaluation(Number(btn.dataset.id));
      renderAnalyticsDashboard(container, criteria);
    });
  });

  // Wire clear all
  container.querySelector('#btn-clear-all')?.addEventListener('click', () => {
    if (confirm('Delete all stored evaluations?')) {
      clearAllEvaluations();
      renderAnalyticsDashboard(container, criteria);
    }
  });
}

/* ── Helpers ── */

function statCard(label, value, sub) {
  return `<div class="an-stat-card">
    <div class="an-stat-val">${value}</div>
    <div class="an-stat-sub">${sub}</div>
    <div class="an-stat-label">${label}</div>
  </div>`;
}

function verdictColor(score) {
  if (score >= 4) return '#3a8c5c';
  if (score >= 3) return '#8c6a2a';
  return '#8c3a3a';
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escA(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Donut SVG ── */
function donutSVG(counts, total) {
  const cx = 60, cy = 60, r = 44, stroke = 18;
  const circ = 2 * Math.PI * r;
  const colors = { serious: '#3a8c5c', hybrid: '#8c6a2a', gamification: '#8c3a3a' };
  const order  = ['serious', 'hybrid', 'gamification'];

  let offset = 0;
  const arcs = order.map((key) => {
    const count = counts[key] || 0;
    const pct   = total ? count / total : 0;
    const dash  = pct * circ;
    const arc   = `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${colors[key]}" stroke-width="${stroke}"
      stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}"
      stroke-dashoffset="${(-offset * circ / (2*Math.PI*r) * circ + circ/4 * 0).toFixed(2)}"
      transform="rotate(${(offset / total * 360 - 90).toFixed(2)} ${cx} ${cy})"
      stroke-linecap="butt" />`;
    offset += count;
    return arc;
  });

  const centerLabel = total ? `<text x="${cx}" y="${cy+2}" text-anchor="middle" dominant-baseline="middle"
    font-family="DM Mono,monospace" font-size="13" fill="#f0ede6" font-weight="500">${total}</text>
    <text x="${cx}" y="${cy+16}" text-anchor="middle" dominant-baseline="middle"
    font-family="DM Sans,sans-serif" font-size="7" fill="#6b6760">total</text>` : '';

  return `<svg class="an-donut" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1e1e1e" stroke-width="${stroke}"/>
    ${arcs.join('')}
    ${centerLabel}
  </svg>`;
}

/* ── Criteria bars SVG ── */
function criteriaBarsSVG(avgs, criteria) {
  const W = 260, barH = 12, gap = 22, padL = 4, padT = 8;
  const totalH = padT + criteria.length * gap;

  const bars = criteria.map((c, i) => {
    const y    = padT + i * gap;
    const pct  = ((avgs[i] - 1) / 4);
    const bw   = Math.max(2, pct * (W - padL - 50));
    const color= verdictColor(avgs[i]);
    const abbr = c.name.split(' ')[0];
    return `
      <text x="${padL}" y="${y + barH - 1}" font-family="DM Sans,sans-serif" font-size="9"
        fill="#6b6760">${abbr}</text>
      <rect x="${padL + 68}" y="${y}" width="${W - padL - 68 - 32}" height="${barH}"
        rx="2" fill="#1e1e1e"/>
      <rect x="${padL + 68}" y="${y}" width="${bw.toFixed(1)}" height="${barH}"
        rx="2" fill="${color}"/>
      <text x="${W - 28}" y="${y + barH - 1}" font-family="DM Mono,monospace" font-size="9"
        fill="#c8a84b" text-anchor="end">${avgs[i].toFixed(2)}</text>`;
  }).join('');

  return `<svg class="an-bars" viewBox="0 0 ${W} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    ${bars}
  </svg>`;
}

/* ── Distribution histogram SVG ── */
function distributionSVG(dist, total) {
  const W = 220, H = 80, pad = 10;
  const labels = ['1–2', '2–3', '3–4', '4–5'];
  const colors = ['#8c3a3a', '#8c5a2a', '#8c6a2a', '#3a8c5c'];
  const maxVal = Math.max(...dist, 1);
  const bw     = (W - pad * 2 - 3 * 6) / 4;

  const bars = dist.map((v, i) => {
    const bh    = ((v / maxVal) * (H - 28)).toFixed(1);
    const x     = pad + i * (bw + 6);
    const y     = H - 18 - bh;
    const pct   = total ? Math.round(v / total * 100) : 0;
    return `
      <rect x="${x.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${bh}"
        rx="2" fill="${colors[i]}" opacity="0.85"/>
      <text x="${(x + bw/2).toFixed(1)}" y="${H - 18 + 11}"
        text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#6b6760">${labels[i]}</text>
      ${v > 0 ? `<text x="${(x + bw/2).toFixed(1)}" y="${parseFloat(y) - 3}"
        text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#f0ede6">${pct}%</text>` : ''}`;
  }).join('');

  return `<svg class="an-dist" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${bars}
  </svg>`;
}

/* Exports */
Object.assign(window.SGDF, {
  saveEvaluation,
  loadEvaluations,
  deleteEvaluation,
  clearAllEvaluations,
  computeAggregates,
  renderAnalyticsDashboard,
});