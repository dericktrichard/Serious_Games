/* ============================================================
   analytics.js — Evaluation store + admin dashboard
   Storage: localStorage  key "sgdf_evals"
   Admin session: sessionStorage key "sgdf_admin"
   No external libraries — charts drawn with inline SVG
   ============================================================ */

window.SGDF = window.SGDF || {};

const STORE_KEY = 'sgdf_evals';
const ADMIN_PIN = '2024';
const ADMIN_KEY = 'sgdf_admin';

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
function isAdminAuthed() {
  return sessionStorage.getItem(ADMIN_KEY) === 'true';
}

function attemptAdminLogin(pin) {
  if (pin === ADMIN_PIN) {
    sessionStorage.setItem(ADMIN_KEY, 'true');
    return true;
  }
  return false;
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_KEY);
}

/* ══════════════════════════════════════
   STORAGE
══════════════════════════════════════ */
function loadEvaluations() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}

function saveEvaluation({ gameName, score, verdict, scores, conditionsArr, notes }) {
  const all   = loadEvaluations();
  const entry = {
    id:          Date.now(),
    ts:          new Date().toISOString(),
    gameName:    (gameName || 'Unnamed Game').trim(),
    score,
    verdictKey:  verdict.key,
    verdictLabel:verdict.label,
    scores:      [...scores],
    conditions:  [...conditionsArr],
    notes:       notes || '',
  };
  all.push(entry);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { console.warn('Storage full', e); }
  return entry;
}

function deleteEvaluation(id) {
  localStorage.setItem(STORE_KEY, JSON.stringify(loadEvaluations().filter(e => e.id !== id)));
}

function clearAllEvaluations() {
  localStorage.removeItem(STORE_KEY);
}

/* ══════════════════════════════════════
   AGGREGATES
══════════════════════════════════════ */
function computeAggregates(entries) {
  if (!entries || !entries.length) return null;
  const n = entries.length;

  const verdictCounts = { serious: 0, hybrid: 0, gamification: 0 };
  entries.forEach(e => { verdictCounts[e.verdictKey] = (verdictCounts[e.verdictKey] || 0) + 1; });

  const avgScore = Math.round(entries.reduce((s, e) => s + e.score, 0) / n * 100) / 100;

  const criteriaAvg = entries[0].scores.map((_, i) =>
    Math.round(entries.reduce((s, e) => s + (e.scores[i] || 3), 0) / n * 100) / 100
  );

  // Score buckets: <2, 2–3, 3–4, ≥4
  const dist = [0, 0, 0, 0];
  entries.forEach(e => {
    if      (e.score < 2) dist[0]++;
    else if (e.score < 3) dist[1]++;
    else if (e.score < 4) dist[2]++;
    else                  dist[3]++;
  });

  // Condition hit rates
  const condRates = entries[0].conditions.map((_, i) =>
    Math.round(entries.filter(e => e.conditions[i]).length / n * 100)
  );

  // Top games by frequency
  const gameMap = {};
  entries.forEach(e => {
    const k = e.gameName.toLowerCase().trim();
    if (!gameMap[k]) gameMap[k] = { name: e.gameName, count: 0, scoreSum: 0, verdicts: {} };
    gameMap[k].count++;
    gameMap[k].scoreSum += e.score;
    gameMap[k].verdicts[e.verdictKey] = (gameMap[k].verdicts[e.verdictKey] || 0) + 1;
  });
  const topGames = Object.values(gameMap)
    .map(g => ({ ...g, avgScore: Math.round(g.scoreSum / g.count * 100) / 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { n, verdictCounts, avgScore, criteriaAvg, dist, condRates, topGames };
}

/* ══════════════════════════════════════
   ADMIN DASHBOARD RENDERER
   Only called after PIN verification
══════════════════════════════════════ */
function renderAdminDashboard(container, criteria, conditions) {
  const entries = (window.SGDF && typeof window.SGDF.loadEvaluations === 'function')
    ? window.SGDF.loadEvaluations()
    : loadEvaluations();
  const agg     = computeAggregates(entries);

  container.innerHTML = '';

  if (!agg) {
    container.innerHTML = `
      <div class="an-empty">
        <div class="an-empty-icon">◎</div>
        <p class="an-empty-title">No evaluations on record</p>
        <p class="an-empty-sub">Evaluations submitted through the framework will appear here.</p>
      </div>`;
    return;
  }

  /* ── 1. Summary stats ── */
  const pctSerious = Math.round((agg.verdictCounts.serious || 0) / agg.n * 100);
  const pctGamif   = Math.round((agg.verdictCounts.gamification || 0) / agg.n * 100);
  const pctHybrid  = Math.round((agg.verdictCounts.hybrid || 0) / agg.n * 100);

  const summaryHTML = `
    <div class="an-summary-row">
      ${mkStat(agg.n, '', 'Total Evaluations')}
      ${mkStat(agg.avgScore.toFixed(2), '/ 5.00', 'Average Score')}
      ${mkStat(pctSerious + '%', `${agg.verdictCounts.serious} games`, 'Serious Game')}
      ${mkStat(pctHybrid  + '%', `${agg.verdictCounts.hybrid} games`,  'Hybrid')}
      ${mkStat(pctGamif   + '%', `${agg.verdictCounts.gamification} games`, 'Gamification')}
    </div>`;

  /* ── 2. Charts row ── */
  const chartsHTML = `
    <div class="an-charts-row">
      <div class="an-chart-card">
        <div class="an-card-title">Verdict Distribution</div>
        ${donutSVG(agg.verdictCounts, agg.n)}
        <div class="an-donut-legend">
          <span class="dl-item serious">● Serious Game <em>${agg.verdictCounts.serious || 0}</em></span>
          <span class="dl-item hybrid">● Hybrid <em>${agg.verdictCounts.hybrid || 0}</em></span>
          <span class="dl-item gamification">● Gamification <em>${agg.verdictCounts.gamification || 0}</em></span>
        </div>
      </div>
      <div class="an-chart-card">
        <div class="an-card-title">Average Score per Criterion</div>
        ${criteriaBarSVG(agg.criteriaAvg, criteria)}
      </div>
      <div class="an-chart-card">
        <div class="an-card-title">Score Distribution</div>
        ${histSVG(agg.dist, agg.n)}
      </div>
    </div>`;

  /* ── 3. Condition rates ── */
  const condRateHTML = `
    <div class="an-section-title">Non-Negotiable Condition Adoption Rates</div>
    <div class="an-cond-rates">
      ${conditions.map((c, i) => `
        <div class="an-cond-row">
          <span class="an-cond-name">${c.name}</span>
          <div class="an-cond-bar-wrap">
            <div class="an-cond-bar" style="width:${agg.condRates[i]}%"></div>
          </div>
          <span class="an-cond-pct">${agg.condRates[i]}%</span>
        </div>`).join('')}
    </div>`;

  /* ── 4. Top games ── */
  const topHTML = `
    <div class="an-section-title">Games Evaluated (Most Frequent)</div>
    <div class="an-top-games">
      ${agg.topGames.map(g => `
        <div class="an-top-row">
          <span class="an-top-name">${escA(g.name)}</span>
          <span class="vtag ${dominantVerdict(g.verdicts)}">${verdictLabel(dominantVerdict(g.verdicts))}</span>
          <div class="an-top-bar-wrap">
            <div class="an-top-bar" style="width:${((g.avgScore-1)/4*100).toFixed(1)}%;background:${scoreCol(g.avgScore)}"></div>
          </div>
          <span class="an-top-score">${g.avgScore.toFixed(2)}</span>
          <span class="an-top-count">${g.count}×</span>
        </div>`).join('')}
    </div>`;

  /* ── 5. Improvement insights ── */
  const weakCriteria = criteria
    .map((c, i) => ({ name: c.name, avg: agg.criteriaAvg[i] }))
    .filter(c => c.avg < 3.0)
    .sort((a, b) => a.avg - b.avg);

  const insightHTML = weakCriteria.length ? `
    <div class="an-section-title">Common Points of Improvement</div>
    <div class="an-insights">
      ${weakCriteria.map(c => `
        <div class="an-insight-row">
          <span class="an-insight-icon">↓</span>
          <span class="an-insight-text"><strong>${c.name}</strong> — average score ${c.avg.toFixed(2)} / 5.00 across all evaluated games. This criterion is most frequently rated low.</span>
        </div>`).join('')}
    </div>` : `
    <div class="an-section-title">Points of Improvement</div>
    <div class="an-insights">
      <div class="an-insight-row">
        <span class="an-insight-icon" style="color:var(--green)">✓</span>
        <span class="an-insight-text">All criteria average above 3.0 — evaluated games show reasonable educational design across the board.</span>
      </div>
    </div>`;

  /* ── 6. Full evaluations table ── */
  const tableRows = [...entries].reverse().map(e => `
    <tr>
      <td>${escA(e.gameName)}</td>
      <td><span class="vtag ${e.verdictKey}">${e.verdictLabel}</span></td>
      <td class="td-score">${e.score.toFixed(2)}</td>
      <td class="td-date">${fmtDate(e.ts)}</td>
      <td class="td-note">${escA(e.notes || '—')}</td>
      <td><button class="btn-del-row" data-id="${e.id}">✕</button></td>
    </tr>`).join('');

  const tableHTML = `
    <div class="an-section-title">
      All Evaluations
      <button class="btn-clear-all" id="btn-clear-all">Clear All</button>
    </div>
    <div class="an-table-wrap">
      <table class="an-table">
        <thead><tr>
          <th>Game</th><th>Verdict</th><th>Score</th><th>Date</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  container.innerHTML = summaryHTML + chartsHTML + condRateHTML + topHTML + insightHTML + tableHTML;

  /* Wire delete + clear */
  container.querySelectorAll('.btn-del-row').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteEvaluation(Number(btn.dataset.id));
      renderAdminDashboard(container, criteria, conditions);
    });
  });

  container.querySelector('#btn-clear-all')?.addEventListener('click', () => {
    if (confirm('Delete all stored evaluations? This cannot be undone.')) {
      clearAllEvaluations();
      renderAdminDashboard(container, criteria, conditions);
    }
  });
}

/* ══════════════════════════════════════
   ADMIN LOGIN PANEL RENDERER
══════════════════════════════════════ */
function renderAdminLogin(container, onSuccess) {
  container.innerHTML = `
    <div class="admin-login-wrap">
      <div class="admin-login-card">
        <p class="admin-login-eyebrow">Restricted Access</p>
        <h2 class="admin-login-title">Admin Analytics</h2>
        <p class="admin-login-desc">This section is restricted to administrators. Enter the access PIN to continue.</p>
        <div class="admin-pin-field">
          <input type="password" id="admin-pin-input" class="sfield-input"
            placeholder="Enter PIN" maxlength="8" autocomplete="off" />
        </div>
        <div class="admin-login-actions">
          <button class="btn-go" id="btn-pin-submit">Unlock →</button>
          <span class="admin-login-error" id="pin-error"></span>
        </div>
      </div>
    </div>`;

  const input  = container.querySelector('#admin-pin-input');
  const btn    = container.querySelector('#btn-pin-submit');
  const errEl  = container.querySelector('#pin-error');

  const attempt = () => {
    if (attemptAdminLogin(input.value.trim())) {
      onSuccess();
    } else {
      errEl.textContent = 'Incorrect PIN. Please try again.';
      input.value = '';
      input.focus();
    }
  };

  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  input.focus();
}

/* ══════════════════════════════════════
   SVG CHART HELPERS
══════════════════════════════════════ */
function donutSVG(counts, total) {
  const cx = 60, cy = 60, r = 42, sw = 16;
  const C  = 2 * Math.PI * r;
  const colors = { serious: '#3a8c5c', hybrid: '#8c6a2a', gamification: '#8c3a3a' };
  let offset = 0;

  const arcs = ['serious','hybrid','gamification'].map(key => {
    const count = counts[key] || 0;
    const pct   = total ? count / total : 0;
    const dash  = pct * C;
    const rotate= total ? offset / total * 360 - 90 : -90;
    const arc = count > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${colors[key]}" stroke-width="${sw}"
      stroke-dasharray="${dash.toFixed(2)} ${(C-dash).toFixed(2)}"
      transform="rotate(${rotate.toFixed(2)} ${cx} ${cy})"
      stroke-linecap="butt"/>` : '';
    offset += count;
    return arc;
  }).join('');

  return `<svg class="an-donut" viewBox="0 0 120 120">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1e1e1e" stroke-width="${sw}"/>
    ${arcs}
    <text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="middle"
      font-family="DM Mono,monospace" font-size="14" fill="#f5f2ec" font-weight="500">${total}</text>
    <text x="${cx}" y="${cy+15}" text-anchor="middle" dominant-baseline="middle"
      font-family="DM Sans,sans-serif" font-size="7" fill="#8a8780">total</text>
  </svg>`;
}

function criteriaBarSVG(avgs, criteria) {
  const W = 280, rowH = 22, pad = 6;
  const H = pad + criteria.length * rowH;
  const maxW = W - 80 - pad;

  const bars = criteria.map((c, i) => {
    const pct   = Math.max(0, Math.min(1, (avgs[i] - 1) / 4));
    const bw    = (pct * maxW).toFixed(1);
    const color = scoreCol(avgs[i]);
    const abbr  = c.name.length > 12 ? c.name.slice(0, 11) + '…' : c.name;
    const y     = pad + i * rowH;
    return `
      <text x="0" y="${y+13}" font-family="DM Sans,sans-serif" font-size="9" fill="#8a8780">${abbr}</text>
      <rect x="80" y="${y+2}" width="${maxW}" height="10" rx="2" fill="#1e1e1e"/>
      <rect x="80" y="${y+2}" width="${bw}"   height="10" rx="2" fill="${color}"/>
      <text x="${W}" y="${y+13}" text-anchor="end" font-family="DM Mono,monospace" font-size="9" fill="#c8a84b">${avgs[i].toFixed(2)}</text>`;
  }).join('');

  return `<svg class="an-bars" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function histSVG(dist, total) {
  const W = 220, H = 80, padL = 8, padB = 18;
  const labels = ['< 2', '2–3', '3–4', '4–5'];
  const colors = ['#8c3a3a','#8c5a2a','#8c6a2a','#3a8c5c'];
  const maxV   = Math.max(...dist, 1);
  const bw     = (W - padL * 2 - 3 * 6) / 4;
  const maxH   = H - padB - 10;

  const bars = dist.map((v, i) => {
    const bh   = ((v / maxV) * maxH).toFixed(1);
    const x    = (padL + i * (bw + 6)).toFixed(1);
    const y    = (H - padB - bh).toFixed(1);
    const pct  = total ? Math.round(v / total * 100) : 0;
    return `
      <rect x="${x}" y="${y}" width="${bw.toFixed(1)}" height="${bh}" rx="2" fill="${colors[i]}" opacity="0.9"/>
      <text x="${(parseFloat(x)+bw/2).toFixed(1)}" y="${H - padB + 11}"
        text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#8a8780">${labels[i]}</text>
      ${v > 0 ? `<text x="${(parseFloat(x)+bw/2).toFixed(1)}" y="${(parseFloat(y)-3).toFixed(1)}"
        text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#f5f2ec">${pct}%</text>` : ''}`;
  }).join('');

  return `<svg class="an-dist" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

/* ── Small helpers ── */
function mkStat(val, sub, label) {
  return `<div class="an-stat-card">
    <div class="an-stat-val">${val}</div>
    <div class="an-stat-sub">${sub}</div>
    <div class="an-stat-label">${label}</div>
  </div>`;
}

function scoreCol(v) {
  if (v >= 4) return '#3a8c5c';
  if (v >= 3) return '#8c6a2a';
  return '#8c3a3a';
}

function dominantVerdict(verdicts) {
  return Object.entries(verdicts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'hybrid';
}

function verdictLabel(key) {
  return { serious:'Serious Game', hybrid:'Hybrid', gamification:'Gamification' }[key] || key;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function escA(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Exports */
Object.assign(window.SGDF, {
  isAdminAuthed, attemptAdminLogin, adminLogout,
  saveEvaluation, loadEvaluations, deleteEvaluation, clearAllEvaluations,
  computeAggregates,
  renderAdminDashboard, renderAdminLogin,
});