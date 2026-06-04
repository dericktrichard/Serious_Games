/* ============================================================
   app.js — Application controller
   Flow: landing → setup → criteria OR conditions (preset) → results
   Admin: accessible via hidden nav link + PIN gate
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
  const {
    isAdminAuthed, adminLogout,
    saveEvaluation,
    renderAdminDashboard, renderAdminLogin,
  } = window.SGDF;

  /* ── State ── */
  const scores     = new Array(CRITERIA.length).fill(null);
  const condValues = new Array(CONDITIONS.length).fill(false);
  let currentQ     = 0;
  let activePreset = null;
  let currentPanel = 'landing';

  /* ── DOM refs ── */
  const gameNameInput = document.getElementById('game-name');
  const notesInput    = document.getElementById('notes');
  const condCardsEl   = document.getElementById('cond-cards');
  const resultsWrap   = document.getElementById('results-wrap');
  const adminWrap     = document.getElementById('admin-wrap');
  const stepper       = document.getElementById('stepper');

  const PANELS = {
    landing:    document.getElementById('panel-landing'),
    setup:      document.getElementById('panel-setup'),
    criteria:   document.getElementById('panel-criteria'),
    conditions: document.getElementById('panel-conditions'),
    results:    document.getElementById('panel-results'),
    admin:      document.getElementById('panel-admin'),
  };

  const STEP_ORDER = ['setup','criteria','conditions','results'];
  const STEP_ELS   = STEP_ORDER.map(id => document.getElementById(`step-${id}`));
  const LINE_ELS   = [1,2,3].map(i => document.getElementById(`line-${i}`));

  /* ════════════════════════════════════
     PANEL NAVIGATION
  ════════════════════════════════════ */
  function showPanel(name) {
    currentPanel = name;
    Object.entries(PANELS).forEach(([k, el]) => el?.classList.toggle('active', k === name));

    // Stepper only visible during evaluate flow
    const inFlow = STEP_ORDER.includes(name);
    stepper.style.display = inFlow ? '' : 'none';

    if (inFlow) {
      const idx = STEP_ORDER.indexOf(name);
      STEP_ELS.forEach((el, i) => {
        el.classList.remove('active','done','unlocked');
        if (i < idx)  el.classList.add('done','unlocked');
        if (i === idx) el.classList.add('active','unlocked');
      });
      LINE_ELS.forEach((el, i) => { el.style.width = idx > i ? '100%' : '0%'; });
    }

    // Top-bar admin link visibility
    const adminLink = document.getElementById('admin-nav-link');
    if (adminLink) adminLink.style.display = name === 'admin' ? 'none' : '';

    refreshProgress();
  }

  // Click-back on completed steps
  STEP_ORDER.forEach((id, i) => {
    STEP_ELS[i].addEventListener('click', () => {
      if (!STEP_ELS[i].classList.contains('done')) return;
      showPanel(id);
      if (id === 'criteria')   renderCurrentQ();
      if (id === 'conditions') ensureConditionCards();
    });
  });

  /* ════════════════════════════════════
     PROGRESS RING
  ════════════════════════════════════ */
  function refreshProgress() {
    const total = CRITERIA.length + CONDITIONS.length;
    const answered = scores.filter(Boolean).length + condValues.filter(Boolean).length;
    const labels = {
      landing:    '',
      setup:      'Not started',
      criteria:   `Criteria ${scores.filter(Boolean).length}/${CRITERIA.length}`,
      conditions: `Conditions ${condValues.filter(Boolean).length}/${CONDITIONS.length}`,
      results:    'Complete',
      admin:      'Admin',
    };
    updateProgress(answered, total, labels[currentPanel] || '');
  }

  /* ════════════════════════════════════
     LANDING PAGE ACTIONS
  ════════════════════════════════════ */
  document.getElementById('btn-landing-start').addEventListener('click', () => {
    showPanel('setup');
  });

  document.getElementById('btn-landing-presets').addEventListener('click', () => {
    showPanel('setup');
    // Scroll to presets section
    setTimeout(() => {
      document.querySelector('.preset-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  });

  /* ════════════════════════════════════
     PRESETS
  ════════════════════════════════════ */
  document.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const ex = EXAMPLES.find(e => e.key === btn.dataset.example);
      if (!ex) return;
      document.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePreset = ex.key;
      gameNameInput.value = ex.gameName;
      notesInput.value    = ex.notes;
      // Pre-fill scores and conditions into state
      ex.scores.forEach((s, i)     => { scores[i]     = s; });
      ex.conditions.forEach((v, i) => { condValues[i] = v; });
      refreshProgress();
    });
  });

  /* ════════════════════════════════════
     SETUP → next step
     Preset: skip criteria, go straight to conditions
     Manual: go through criteria one by one
  ════════════════════════════════════ */
  document.getElementById('btn-start').addEventListener('click', () => {
    if (activePreset) {
      ensureConditionCards();
      showPanel('conditions');
    } else {
      currentQ = 0;
      showPanel('criteria');
      renderCurrentQ();
    }
  });

  document.getElementById('btn-back-setup').addEventListener('click', () => showPanel('setup'));
  document.getElementById('btn-back-to-landing')?.addEventListener('click', () => showPanel('landing'));

  /* ════════════════════════════════════
     CRITERIA — question by question
  ════════════════════════════════════ */
  function renderCurrentQ() {
    renderQuestionCard({
      criterion:      CRITERIA[currentQ],
      questionIndex:  currentQ,
      totalQuestions: CRITERIA.length,
      currentValue:   scores[currentQ],

      onSelect(v) {
        scores[currentQ] = v;
        refreshProgress();
        updateInlineBar();
        if (currentQ < CRITERIA.length - 1) {
          setTimeout(() => advanceQ(1), 360);
        } else {
          const nb = document.getElementById('btn-q-next');
          if (nb) nb.style.color = 'var(--gold)';
        }
      },
      onPrev() { if (currentQ > 0) advanceQ(-1); },
      onNext() {
        if (currentQ < CRITERIA.length - 1) advanceQ(1);
        else { ensureConditionCards(); showPanel('conditions'); }
      },
    });
    updateInlineBar();
  }

  function advanceQ(dir) {
    animateCardTransition(dir, () => {
      currentQ = Math.max(0, Math.min(CRITERIA.length - 1, currentQ + dir));
      renderCurrentQ();
      refreshProgress();
    });
  }

  function updateInlineBar() {
    const card = document.getElementById('q-card');
    if (!card) return;
    let bar = card.querySelector('.q-progress-track');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'q-progress-track';
      bar.innerHTML = '<div class="q-progress-fill" id="q-prog-fill"></div>';
      card.prepend(bar);
    }
    const fill    = document.getElementById('q-prog-fill');
    const answered = scores.filter(s => s !== null).length;
    if (fill) fill.style.width = (answered / CRITERIA.length * 100) + '%';
  }

  /* ════════════════════════════════════
     CONDITIONS
  ════════════════════════════════════ */
  function ensureConditionCards() {
    buildConditionCards(condCardsEl, CONDITIONS);
    setConditions(CONDITIONS, condValues);
    CONDITIONS.forEach((cond, i) => {
      const cb = document.getElementById(`cond-${cond.id}`);
      if (!cb) return;
      cb.addEventListener('change', e => {
        condValues[i] = e.target.checked;
        refreshProgress();
      });
    });
  }

  document.getElementById('btn-back-criteria').addEventListener('click', () => {
    if (activePreset) showPanel('setup');
    else { currentQ = CRITERIA.length - 1; showPanel('criteria'); renderCurrentQ(); }
  });

  document.getElementById('btn-to-results').addEventListener('click', () => {
    const gameName      = gameNameInput.value.trim() || 'Unnamed Game';
    const conditionsArr = collectConditions(CONDITIONS);
    const notes         = notesInput.value.trim();
    const finalScores   = scores.map(s => s ?? 3.0);
    const score         = computeWeightedScore(finalScores, CRITERIA);
    const verdict       = getVerdict(score);

    // Save to analytics store
    saveEvaluation({ gameName, score, verdict, scores: finalScores, conditionsArr, notes });

    renderResults({
      wrap: resultsWrap,
      gameName, score, verdict,
      scores: finalScores, criteria: CRITERIA,
      conditionsArr, conditionDefs: CONDITIONS, notes,
    });

    showPanel('results');

    document.getElementById('btn-copy-r')?.addEventListener('click', () => {
      copyText(buildTextReport({
        gameName, score, verdict, scores: finalScores,
        criteria: CRITERIA, conditions: conditionsArr,
        conditionDefs: CONDITIONS, notes,
      }));
    });

    document.getElementById('btn-restart-r')?.addEventListener('click', resetAll);
  });

  /* ════════════════════════════════════
     ADMIN PANEL
     Accessed via hidden link in top bar
     Gated behind PIN — session persists until tab closes
  ════════════════════════════════════ */
  document.getElementById('admin-nav-link').addEventListener('click', e => {
    e.preventDefault();
    showAdminPanel();
  });

  function showAdminPanel() {
    showPanel('admin');
    // Hide stepper explicitly
    stepper.style.display = 'none';

    if (isAdminAuthed()) {
      renderAdminDashboard(adminWrap, CRITERIA, CONDITIONS);
      renderAdminHeader(true);
    } else {
      renderAdminLogin(adminWrap, () => {
        // On successful PIN entry
        renderAdminDashboard(adminWrap, CRITERIA, CONDITIONS);
        renderAdminHeader(true);
      });
      renderAdminHeader(false);
    }
  }

  function renderAdminHeader(authed) {
    const hdr = document.getElementById('admin-panel-header');
    if (!hdr) return;
    if (authed) {
      hdr.innerHTML = `
        <button class="btn-admin-logout" id="btn-admin-logout">← Exit Admin</button>`;
      document.getElementById('btn-admin-logout').addEventListener('click', () => {
        adminLogout();
        resetAll();
      });
    } else {
      hdr.innerHTML = `
        <button class="btn-ghost-sm" id="btn-admin-back">← Back</button>`;
      document.getElementById('btn-admin-back').addEventListener('click', () => {
        showPanel(currentPanel === 'admin' ? 'landing' : currentPanel);
        showPanel('landing');
      });
    }
  }

  /* ════════════════════════════════════
     RESET
  ════════════════════════════════════ */
  function resetAll() {
    scores.fill(null);
    condValues.fill(false);
    currentQ = 0; activePreset = null;
    gameNameInput.value = ''; notesInput.value = '';
    document.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
    resultsWrap.innerHTML = ''; condCardsEl.innerHTML = '';
    showPanel('landing');
  }

  /* ════════════════════════════════════
     COPY
  ════════════════════════════════════ */
  function copyText(text) {
    const flash = () => {
      const el = document.getElementById('copy-flash');
      if (!el) return;
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), 2200);
    };
    navigator.clipboard.writeText(text).then(flash).catch(() => {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      Object.assign(ta.style, { position:'fixed', opacity:'0' });
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      flash();
    });
  }

  /* ── Init ── */
  showPanel('landing');

})();