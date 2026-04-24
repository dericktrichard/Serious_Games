/* ============================================================
   app.js — Application controller
   Fixes: progress tracking, preset auto-skip, conditions timing
   ============================================================ */

(function () {
  'use strict';

  const { CRITERIA, CONDITIONS, EXAMPLES }                    = window.SGDF;
  const { computeWeightedScore, getVerdict, buildTextReport } = window.SGDF;
  const {
    renderQuestionCard, animateCardTransition,
    buildConditionCards, collectConditions, setConditions,
    renderResults, updateProgress,
  } = window.SGDF;

  /* ══════════════════════════════════════
     STATE
     scores[i] = null (unanswered) | 1.0–5.0
     condValues[i] = true | false
  ══════════════════════════════════════ */
  const scores    = new Array(CRITERIA.length).fill(null);
  const condValues= new Array(CONDITIONS.length).fill(false);
  let currentQ    = 0;
  let activePreset= null;
  let currentPanel= 'setup';

  /* ── DOM refs ── */
  const gameNameInput = document.getElementById('game-name');
  const notesInput    = document.getElementById('notes');
  const condCardsEl   = document.getElementById('cond-cards');
  const resultsWrap   = document.getElementById('results-wrap');

  const PANELS = {
    setup:      document.getElementById('panel-setup'),
    criteria:   document.getElementById('panel-criteria'),
    conditions: document.getElementById('panel-conditions'),
    results:    document.getElementById('panel-results'),
  };

  const STEPS = {
    setup:      document.getElementById('step-setup'),
    criteria:   document.getElementById('step-criteria'),
    conditions: document.getElementById('step-conditions'),
    results:    document.getElementById('step-results'),
  };

  const LINES = {
    1: document.getElementById('line-1'),
    2: document.getElementById('line-2'),
    3: document.getElementById('line-3'),
  };

  const PANEL_ORDER = ['setup', 'criteria', 'conditions', 'results'];

  /* ══════════════════════════════════════
     PANEL NAVIGATION
  ══════════════════════════════════════ */
  function showPanel(name) {
    currentPanel = name;
    const idx    = PANEL_ORDER.indexOf(name);

    Object.entries(PANELS).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });

    PANEL_ORDER.forEach((key, i) => {
      const step = STEPS[key];
      step.classList.remove('active', 'done', 'unlocked');
      if (i < idx)   step.classList.add('done', 'unlocked');
      if (i === idx) step.classList.add('active', 'unlocked');
    });

    LINES[1].style.width = idx >= 1 ? '100%' : '0%';
    LINES[2].style.width = idx >= 2 ? '100%' : '0%';
    LINES[3].style.width = idx >= 3 ? '100%' : '0%';

    refreshProgress();
  }

  // Allow clicking done steps to navigate back
  PANEL_ORDER.forEach((key) => {
    STEPS[key].addEventListener('click', () => {
      if (!STEPS[key].classList.contains('done')) return;
      showPanel(key);
      if (key === 'criteria') renderCurrentQ();
      if (key === 'conditions') ensureConditionCards();
    });
  });

  /* ══════════════════════════════════════
     PROGRESS — tracks ALL 10 items live
     5 criteria scores + 5 condition checks
  ══════════════════════════════════════ */
  function countAnswered() {
    const criteriaAnswered   = scores.filter((s) => s !== null).length;
    const conditionsAnswered = condValues.filter(Boolean).length;
    return criteriaAnswered + conditionsAnswered;
  }

  function refreshProgress() {
    const total    = CRITERIA.length + CONDITIONS.length; // 10
    const answered = countAnswered();

    const labelMap = {
      setup:      'Not started',
      criteria:   `Criteria — ${scores.filter((s) => s !== null).length} / ${CRITERIA.length}`,
      conditions: `Conditions — ${condValues.filter(Boolean).length} / ${CONDITIONS.length} checked`,
      results:    'Complete',
    };

    updateProgress(answered, total, labelMap[currentPanel] || '');
  }

  /* ══════════════════════════════════════
     PRESETS
  ══════════════════════════════════════ */
  document.querySelectorAll('.preset-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ex = EXAMPLES.find((e) => e.key === btn.dataset.example);
      if (!ex) return;

      document.querySelectorAll('.preset-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activePreset = ex.key;

      // Populate form fields
      gameNameInput.value = ex.gameName;
      notesInput.value    = ex.notes;

      // Load scores into state
      ex.scores.forEach((s, i) => { scores[i] = s; });

      // Load condition values into state
      ex.conditions.forEach((v, i) => { condValues[i] = v; });

      refreshProgress();
    });
  });

  /* ══════════════════════════════════════
     SETUP → next step
     If preset: skip criteria, go straight to conditions
     If manual: go through criteria one by one
  ══════════════════════════════════════ */
  document.getElementById('btn-start').addEventListener('click', () => {
    if (activePreset) {
      // Preset: all scores are loaded — skip straight to conditions
      ensureConditionCards();
      showPanel('conditions');
    } else {
      currentQ = 0;
      showPanel('criteria');
      renderCurrentQ();
    }
  });

  document.getElementById('btn-back-setup').addEventListener('click', () => {
    showPanel('setup');
  });

  /* ══════════════════════════════════════
     CRITERIA — question-by-question
  ══════════════════════════════════════ */
  function renderCurrentQ() {
    renderQuestionCard({
      criterion:      CRITERIA[currentQ],
      questionIndex:  currentQ,
      totalQuestions: CRITERIA.length,
      currentValue:   scores[currentQ],

      onSelect(value) {
        scores[currentQ] = value;
        refreshProgress();
        // Auto-advance unless it's the last question
        if (currentQ < CRITERIA.length - 1) {
          setTimeout(() => advanceQ(1), 360);
        }
        // On last question, the Next button now glows
        else {
          const nb = document.getElementById('btn-q-next');
          if (nb) nb.style.color = 'var(--gold)';
        }
      },

      onPrev() {
        if (currentQ > 0) advanceQ(-1);
      },

      onNext() {
        if (currentQ < CRITERIA.length - 1) {
          advanceQ(1);
        } else {
          // All criteria done — move to conditions
          ensureConditionCards();
          showPanel('conditions');
        }
      },
    });

    updateInlineProgressBar();
  }

  function advanceQ(dir) {
    animateCardTransition(dir, () => {
      currentQ = Math.max(0, Math.min(CRITERIA.length - 1, currentQ + dir));
      renderCurrentQ();
      refreshProgress();
    });
  }

  function updateInlineProgressBar() {
    const card = document.getElementById('q-card');
    if (!card) return;
    let bar = card.querySelector('.q-progress-track');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'q-progress-track';
      bar.innerHTML = '<div class="q-progress-fill" id="q-prog-fill"></div>';
      card.prepend(bar);
    }
    const fill = document.getElementById('q-prog-fill');
    // Show progress as answered count, not current index
    const answered = scores.filter((s) => s !== null).length;
    if (fill) fill.style.width = (answered / CRITERIA.length * 100) + '%';
  }

  /* ══════════════════════════════════════
     CONDITIONS
     ensureConditionCards builds the DOM once,
     then immediately applies state (preset or manual)
  ══════════════════════════════════════ */
  function ensureConditionCards() {
    // Always rebuild so checkboxes are fresh
    buildConditionCards(condCardsEl, CONDITIONS);

    // Apply state (works for both presets and manual toggles)
    setConditions(CONDITIONS, condValues);

    // Wire up live state sync
    CONDITIONS.forEach((cond, i) => {
      const cb = document.getElementById(`cond-${cond.id}`);
      if (!cb) return;
      cb.addEventListener('change', (e) => {
        condValues[i] = e.target.checked;
        refreshProgress();
      });
    });
  }

  document.getElementById('btn-back-criteria').addEventListener('click', () => {
    if (activePreset) {
      // Preset: go back to setup, not criteria
      showPanel('setup');
    } else {
      currentQ = CRITERIA.length - 1;
      showPanel('criteria');
      renderCurrentQ();
    }
  });

  document.getElementById('btn-to-results').addEventListener('click', () => {
    const gameName      = gameNameInput.value.trim() || 'Unnamed Game';
    const conditionsArr = collectConditions(CONDITIONS);
    const notes         = notesInput.value.trim();
    const finalScores   = scores.map((s) => s ?? 3.0); // neutral fallback

    const score   = computeWeightedScore(finalScores, CRITERIA);
    const verdict = getVerdict(score);

    renderResults({
      wrap: resultsWrap,
      gameName, score, verdict,
      scores:        finalScores,
      criteria:      CRITERIA,
      conditionsArr,
      conditionDefs: CONDITIONS,
      notes,
    });

    showPanel('results');

    document.getElementById('btn-copy-r')?.addEventListener('click', () => {
      copyText(buildTextReport({
        gameName, score, verdict,
        scores:        finalScores,
        criteria:      CRITERIA,
        conditions:    conditionsArr,
        conditionDefs: CONDITIONS,
        notes,
      }));
    });

    document.getElementById('btn-restart-r')?.addEventListener('click', resetAll);
  });

  /* ══════════════════════════════════════
     RESET
  ══════════════════════════════════════ */
  function resetAll() {
    scores.fill(null);
    condValues.fill(false);
    currentQ     = 0;
    activePreset = null;

    gameNameInput.value = '';
    notesInput.value    = '';
    document.querySelectorAll('.preset-pill').forEach((b) => b.classList.remove('active'));

    resultsWrap.innerHTML = '';
    condCardsEl.innerHTML = '';

    showPanel('setup');
  }

  /* ══════════════════════════════════════
     COPY
  ══════════════════════════════════════ */
  function copyText(text) {
    const flash = () => {
      const el = document.getElementById('copy-flash');
      if (!el) return;
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), 2200);
    };
    navigator.clipboard.writeText(text).then(flash).catch(() => {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      Object.assign(ta.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flash();
    });
  }

  /* ── Init ── */
  showPanel('setup');

})();