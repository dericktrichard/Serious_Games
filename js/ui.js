window.SGDF = window.SGDF || {};

/* ── Response scale ── */
const SCALE = [
  { label: 'Strongly Disagree', value: 1.0 },
  { label: 'Disagree',          value: 2.0 },
  { label: 'Moderate',          value: 3.0 },
  { label: 'Agree',             value: 4.0 },
  { label: 'Strongly Agree',    value: 5.0 },
];

function scoreColor(v) {
  if (v >= 4) return '#3a8c5c';
  if (v >= 3) return '#8c6a2a';
  return '#8c3a3a';
}

/* ════════════════════════════════════
   QUESTION TEXT
   Framed as "To what extent have you observed..."
   so Strongly Agree = high score naturally.
════════════════════════════════════ */
function buildQuestionHTML(c) {
  const q = {
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
  return q[c.id] || `To what extent have you observed that <em>${c.name}</em> is fully present in this game?`;
}

/* ════════════════════════════════════
   QUESTION CARD
════════════════════════════════════ */
function renderQuestionCard({ criterion, questionIndex, totalQuestions, currentValue, onSelect, onPrev, onNext }) {
  document.getElementById('q-current').textContent = questionIndex + 1;
  document.getElementById('q-total').textContent   = totalQuestions;
  document.getElementById('q-tag').textContent     = criterion.name;
  document.getElementById('q-text').innerHTML      = buildQuestionHTML(criterion);

  // Pills
  const pillsEl = document.getElementById('q-pills');
  pillsEl.innerHTML = '';
  SCALE.forEach(({ label, value }) => {
    const btn = document.createElement('button');
    btn.className = 'q-pill' + (currentValue === value ? ' selected' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', currentValue === value ? 'true' : 'false');
    btn.dataset.value = value;
    btn.innerHTML = `<span class="pill-label">${label}</span><span class="pill-val">${value.toFixed(1)}</span>`;
    btn.addEventListener('click', () => {
      pillsEl.querySelectorAll('.q-pill').forEach((p) => { p.classList.remove('selected'); p.setAttribute('aria-checked','false'); });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');
      onSelect(value);
    });
    pillsEl.appendChild(btn);
  });

  // Nav — clone to clear old listeners
  const op = document.getElementById('btn-q-prev');
  const on_ = document.getElementById('btn-q-next');
  const np  = op.cloneNode(true);
  const nn  = on_.cloneNode(true);
  op.replaceWith(np); on_.replaceWith(nn);

  np.disabled    = questionIndex === 0;
  nn.textContent = questionIndex === totalQuestions - 1 ? 'Continue →' : 'Next →';
  np.addEventListener('click', onPrev);
  nn.addEventListener('click', onNext);
}

/* ── Card entrance/exit animation ── */
function animateCardTransition(dir, callback) {
  const card = document.getElementById('q-card');
  card.classList.add('leaving');
  setTimeout(() => { card.classList.remove('leaving'); callback(); }, 180);
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
    label.querySelector('input').addEventListener('change', (e) => label.classList.toggle('on', e.target.checked));
  });
}

function collectConditions(conditions) {
  return conditions.map((c) => document.getElementById(`cond-${c.id}`)?.checked || false);
}

function setConditions(conditions, values) {
  conditions.forEach((c, i) => {
    const cb = document.getElementById(`cond-${c.id}`);
    const lbl = cb?.closest('label');
    if (!cb) return;
    cb.checked = values[i];
    lbl?.classList.toggle('on', values[i]);
  });
}

/* ════════════════════════════════════
   RESULTS
════════════════════════════════════ */
function renderResults({ wrap, gameName, score, verdict, scores, criteria, conditionsArr, conditionDefs, notes }) {
  const { buildConclusionText } = window.SGDF;
  const fillPct  = ((score - 1) / 4) * 100;
  const barColor = { serious: '#3a8c5c', hybrid: '#8c6a2a', gamification: '#8c3a3a' }[verdict.key];

  const breakdown = criteria.map((c, i) => {
    const pct = ((scores[i] - 1) / 4) * 100;
    return `<div class="rb">
      <span class="rb-name">${c.name}</span>
      <span class="rb-score">${scores[i].toFixed(1)}</span>
      <div class="rb-track"><div class="rb-fill" style="width:${pct}%;background:${scoreColor(scores[i])};"></div></div>
    </div>`;
  }).join('');

  const condRows = conditionDefs.map((cd, i) => `
    <div class="r-cond ${conditionsArr[i] ? 'met' : 'unmet'}">
      <span class="r-cond-icon">${conditionsArr[i] ? '✓' : '✗'}</span>
      <span class="r-cond-name">${cd.name}</span>
    </div>`).join('');

  const raw  = buildConclusionText({ gameName, score, verdict, conditions: conditionsArr, conditionDefs, notes });
  const conc = raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(new RegExp(esc(gameName),'g'), `<em>${esc(gameName)}</em>`)
    .replace(/(The question is not whether[\s\S]*?learning\.)$/, '<strong>$1</strong>');

  wrap.innerHTML = `
    <div class="r-header">
      <p class="r-eyebrow">Diagnostic Report</p>
      <h2 class="r-title">Results for <em>${esc(gameName)}</em></h2>
    </div>

    <div class="r-hero">
      <div class="r-score-block">
        <div class="r-score-num">${score.toFixed(2)}</div>
        <div class="r-score-sub">/ 5.00</div>
      </div>
      <div class="r-vline"></div>
      <div class="r-hero-info">
        <div class="r-game-name">${esc(gameName)}</div>
        <span class="r-badge ${verdict.cssClass}"><span class="r-dot"></span>${verdict.label}</span>
        <div class="r-bar-track"><div class="r-bar-fill" id="r-bar" style="width:0%;background:${barColor};"></div></div>
      </div>
    </div>

    <div class="r-grid">
      <div class="r-card"><div class="r-card-title">Criterion Breakdown</div><div class="r-breakdown">${breakdown}</div></div>
      <div class="r-card"><div class="r-card-title">Conditions</div><div class="r-conds">${condRows}</div></div>
      <div class="r-card full"><div class="r-card-title">Conclusion</div><div class="r-conc">${conc}</div></div>
    </div>

    <div class="r-actions">
      <button class="btn-outline" id="btn-copy-r">⎘ Copy Report</button>
      <button class="btn-ghost-sm" id="btn-restart-r">↺ Start Over</button>
      <span class="copy-flash" id="copy-flash">Copied to clipboard</span>
    </div>`;

  requestAnimationFrame(() => {
    setTimeout(() => { const b = document.getElementById('r-bar'); if(b) b.style.width = fillPct+'%'; }, 80);
  });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Progress ring ── */
function updateProgress(answered, total, label) {
  const pct    = total ? Math.round(answered / total * 100) : 0;
  const ring   = document.getElementById('ring-fill');
  const pctEl  = document.getElementById('progress-pct');
  const lblEl  = document.getElementById('progress-label');
  const C      = 100.53;
  if (ring)  ring.style.strokeDashoffset = (C - C * pct / 100).toFixed(2);
  if (pctEl) pctEl.textContent = pct + '%';
  if (lblEl) lblEl.textContent = label || '';
}

Object.assign(window.SGDF, {
  SCALE, scoreColor,
  renderQuestionCard, animateCardTransition,
  buildConditionCards, collectConditions, setConditions,
  renderResults, updateProgress,
});