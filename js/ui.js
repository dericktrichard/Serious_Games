/* ============================================================
   ui.js — DOM builders: question cards, conditions, results
   ============================================================ */

window.SGDF = window.SGDF || {};

/* ── Response scale ── */
const SCALE = [
  { label: 'Strongly Disagree', short: 'Str. Disagree', value: 1.0 },
  { label: 'Disagree',          short: 'Disagree',      value: 2.0 },
  { label: 'Moderate',          short: 'Moderate',      value: 3.0 },
  { label: 'Agree',             short: 'Agree',         value: 4.0 },
  { label: 'Strongly Agree',    short: 'Str. Agree',    value: 5.0 },
];

/* ── Colour per score ── */
function scoreColor(v) {
  if (v >= 4) return '#3a8c5c';
  if (v >= 3) return '#8c6a2a';
  return '#8c3a3a';
}

/* ════════════════════════════════════
   QUESTION FRAMING
   Pattern: "To what extent have you observed..."
   so that Strongly Agree naturally maps to a high score.
════════════════════════════════════ */
function buildQuestionHTML(c) {
  const questions = {
    design_logic:
      `To what extent have you observed that <em>learning objectives are inseparable from the core gameplay</em> — that the game simply could not function without engaging the learning content?`,
    cognitive_demand:
      `To what extent have you observed that this game demands <em>genuine problem-solving and systems thinking</em>, rather than repetitive surface-level actions like tapping or selecting?`,
    failure_function:
      `To what extent have you observed that <em>failure in this game is educationally productive</em> — providing feedback that reveals conceptual misunderstandings rather than just penalising the player?`,
    learning_depth:
      `To what extent have you observed that <em>understanding the content is necessary to progress</em> — that a player cannot succeed through trial-and-error or rote repetition alone?`,
    transfer_evidence:
      `To what extent have you observed <em>credible evidence that skills learned in this game transfer</em> to novel real-world problems outside the game context?`,
  };
  return questions[c.id] || `To what extent have you observed that <em>${c.name}</em> is fully present in this game?`;
}

/* ════════════════════════════════════
   QUESTION CARD RENDERER
════════════════════════════════════ */
function renderQuestionCard({ criterion, questionIndex, totalQuestions, currentValue, onSelect, onPrev, onNext }) {
  const tag      = document.getElementById('q-tag');
  const textEl   = document.getElementById('q-text');
  const pillsEl  = document.getElementById('q-pills');
  const qCurrent = document.getElementById('q-current');
  const qTotal   = document.getElementById('q-total');

  // Counter + header
  qCurrent.textContent = questionIndex + 1;
  qTotal.textContent   = totalQuestions;
  tag.textContent      = criterion.name;
  textEl.innerHTML     = buildQuestionHTML(criterion);

  // Build pills
  pillsEl.innerHTML = '';
  SCALE.forEach(({ label, value }) => {
    const btn = document.createElement('button');
    btn.className = 'q-pill' + (currentValue === value ? ' selected' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', currentValue === value ? 'true' : 'false');
    btn.dataset.value = value;

    btn.innerHTML = `<span class="pill-label">${label}</span>
                     <span class="pill-val">${value.toFixed(1)}</span>`;

    btn.addEventListener('click', () => {
      pillsEl.querySelectorAll('.q-pill').forEach((p) => {
        p.classList.remove('selected');
        p.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');
      onSelect(value);
    });

    pillsEl.appendChild(btn);
  });

  // Nav — clone to wipe stale listeners
  const oldPrev = document.getElementById('btn-q-prev');
  const oldNext = document.getElementById('btn-q-next');

  const newPrev = oldPrev.cloneNode(true);
  const newNext = oldNext.cloneNode(true);
  oldPrev.replaceWith(newPrev);
  oldNext.replaceWith(newNext);

  newPrev.disabled    = questionIndex === 0;
  newNext.textContent = questionIndex === totalQuestions - 1 ? 'Continue →' : 'Next →';

  newPrev.addEventListener('click', onPrev);
  newNext.addEventListener('click', onNext);
}

/* ════════════════════════════════════
   CARD TRANSITION ANIMATION
════════════════════════════════════ */
function animateCardTransition(dir, callback) {
  const card = document.getElementById('q-card');
  card.classList.add('leaving');
  setTimeout(() => {
    card.classList.remove('leaving');
    callback();
  }, 190);
}

/* ════════════════════════════════════
   CONDITIONS
════════════════════════════════════ */
function buildConditionCards(container, conditions) {
  container.innerHTML = '';
  conditions.forEach((cond) => {
    const label = document.createElement('label');
    label.className = 'cond-card';
    label.setAttribute('for', `cond-${cond.id}`);
    label.innerHTML = `
      <input type="checkbox" id="cond-${cond.id}" />
      <span class="cond-check-box">✓</span>
      <span class="cond-text">
        <span class="cond-name">${cond.name}</span>
        <span class="cond-desc">${cond.desc}</span>
      </span>`;
    container.appendChild(label);

    label.querySelector('input').addEventListener('change', (e) => {
      label.classList.toggle('on', e.target.checked);
    });
  });
}

function collectConditions(conditions) {
  return conditions.map((c) => {
    const el = document.getElementById(`cond-${c.id}`);
    return el ? el.checked : false;
  });
}

function setConditions(conditions, values) {
  conditions.forEach((c, i) => {
    const cb    = document.getElementById(`cond-${c.id}`);
    const label = cb?.closest('label');
    if (!cb) return;
    cb.checked = values[i];
    label?.classList.toggle('on', values[i]);
  });
}

/* ════════════════════════════════════
   RESULTS PANEL
════════════════════════════════════ */
function renderResults({ wrap, gameName, score, verdict, scores, criteria, conditionsArr, conditionDefs, notes }) {
  const { buildConclusionText } = window.SGDF;
  const fillPct  = ((score - 1) / 4) * 100;
  const barColor = { serious: '#3a8c5c', hybrid: '#8c6a2a', gamification: '#8c3a3a' }[verdict.key];

  const breakdown = criteria.map((c, i) => {
    const pct   = ((scores[i] - 1) / 4) * 100;
    const color = scoreColor(scores[i]);
    return `<div class="rb">
      <span class="rb-name">${c.name}</span>
      <span class="rb-score">${scores[i].toFixed(1)}</span>
      <div class="rb-track"><div class="rb-fill" style="width:${pct}%;background:${color};"></div></div>
    </div>`;
  }).join('');

  const condRows = conditionDefs.map((cd, i) => `
    <div class="r-cond ${conditionsArr[i] ? 'met' : 'unmet'}">
      <span class="r-cond-icon">${conditionsArr[i] ? '✓' : '✗'}</span>
      <span class="r-cond-name">${cd.name}</span>
    </div>`).join('');

  const rawConc = buildConclusionText({ gameName, score, verdict, conditions: conditionsArr, conditionDefs, notes });
  const fmtConc = rawConc
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(new RegExp(escHtml(gameName), 'g'), `<em>${escHtml(gameName)}</em>`)
    .replace(/(The question is not whether[\s\S]*?learning\.)$/, '<strong>$1</strong>');

  wrap.innerHTML = `
    <div class="r-header">
      <div class="r-eyebrow">Diagnostic Report</div>
      <h2 class="r-title">Results for <em>${escHtml(gameName)}</em></h2>
    </div>

    <div class="r-hero">
      <div class="r-score-block">
        <div class="r-score-num">${score.toFixed(2)}</div>
        <div class="r-score-sub">out of 5.00</div>
      </div>
      <div class="r-vline"></div>
      <div class="r-hero-info">
        <div class="r-game-name">${escHtml(gameName)}</div>
        <div class="r-badge ${verdict.cssClass}">
          <span class="r-badge-dot"></span>${verdict.label}
        </div>
        <div class="r-bar-track">
          <div class="r-bar-fill" id="r-bar" style="width:0%;background:${barColor};"></div>
        </div>
      </div>
    </div>

    <div class="r-grid">
      <div class="r-card">
        <div class="r-card-title">Criterion Breakdown</div>
        <div class="r-breakdown">${breakdown}</div>
      </div>
      <div class="r-card">
        <div class="r-card-title">Conditions</div>
        <div class="r-conds">${condRows}</div>
      </div>
      <div class="r-card full">
        <div class="r-card-title">Conclusion</div>
        <div class="r-conc">${fmtConc}</div>
      </div>
    </div>

    <div class="r-actions">
      <button class="btn-copy-r" id="btn-copy-r">⎘ Copy Report</button>
      <button class="btn-restart-r" id="btn-restart-r">↺ Start Over</button>
      <span class="copy-flash" id="copy-flash">Copied</span>
    </div>`;

  requestAnimationFrame(() => {
    setTimeout(() => {
      const bar = document.getElementById('r-bar');
      if (bar) bar.style.width = fillPct + '%';
    }, 80);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════
   PROGRESS RING
════════════════════════════════════ */
function updateProgress(answered, total, stepLabel) {
  const pct     = Math.round((answered / total) * 100);
  const ringEl  = document.getElementById('ring-fill');
  const pctEl   = document.getElementById('progress-pct');
  const labelEl = document.getElementById('progress-label');
  const circumf = 100.53; // 2π × 16

  if (ringEl)  ringEl.style.strokeDashoffset = circumf - (circumf * pct / 100);
  if (pctEl)   pctEl.textContent = pct + '%';
  if (labelEl) labelEl.textContent = stepLabel || '';
}

// Exports
Object.assign(window.SGDF, {
  SCALE,
  scoreColor,
  renderQuestionCard,
  animateCardTransition,
  buildConditionCards,
  collectConditions,
  setConditions,
  renderResults,
  updateProgress,
});
