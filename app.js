(function () {
  'use strict';

  const { CRITERIA, CONDITIONS, EXAMPLES } = window.SGDF;
  const {
    computeWeightedScore,
    getVerdict,
    buildTextReport,
  } = window.SGDF;
  const {
    buildCriteriaSliders,
    buildConditionsChecklist,
    collectScores,
    collectConditions,
    setSliderValues,
    setConditionValues,
    renderReport,
  } = window.SGDF;

  // ── DOM refs ──
  const gameNameInput   = document.getElementById('game-name');
  const notesInput      = document.getElementById('notes');
  const criteriaMount   = document.getElementById('criteria-mount');
  const conditionsMount = document.getElementById('conditions-mount');
  const reportSection   = document.getElementById('report-section');
  const btnGenerate     = document.getElementById('btn-generate');
  const btnReset        = document.getElementById('btn-reset');
  const exampleBtns     = document.querySelectorAll('.example-btn');

  let activeExampleKey = null;

  // ── Initialise components ──
  buildCriteriaSliders(criteriaMount, CRITERIA);
  buildConditionsChecklist(conditionsMount, CONDITIONS);

  // ── Example loader ──
  exampleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.example;
      const ex = EXAMPLES.find((e) => e.key === key);
      if (!ex) return;

      // Toggle active style
      exampleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeExampleKey = key;

      gameNameInput.value = ex.gameName;
      notesInput.value    = ex.notes;
      setSliderValues(CRITERIA, ex.scores);
      setConditionValues(CONDITIONS, ex.conditions);

      // Hide any existing report when loading new example
      reportSection.classList.remove('visible', 'animated');
      reportSection.style.display = 'none';
    });
  });

  // ── Generate report ──
  btnGenerate.addEventListener('click', () => {
    const gameName = gameNameInput.value.trim() || 'Unnamed Game';
    const scores   = collectScores(CRITERIA);
    const conditionsArr = collectConditions(CONDITIONS);
    const notes    = notesInput.value.trim();

    const score   = computeWeightedScore(scores, CRITERIA);
    const verdict = getVerdict(score);

    renderReport({
      reportSection,
      gameName,
      score,
      verdict,
      scores,
      criteria: CRITERIA,
      conditionsArr,
      conditionDefs: CONDITIONS,
      notes,
    });

    // Wire copy button (rendered inside reportSection)
    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const textReport = buildTextReport({
          gameName, score, verdict, scores,
          criteria: CRITERIA,
          conditions: conditionsArr,
          conditionDefs: CONDITIONS,
          notes,
        });
        navigator.clipboard.writeText(textReport).then(() => {
          const fb = document.getElementById('copy-feedback');
          if (fb) {
            fb.classList.add('show');
            setTimeout(() => fb.classList.remove('show'), 2500);
          }
        }).catch(() => {
          // Fallback for browsers without clipboard API
          const ta = document.createElement('textarea');
          ta.value = textReport;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        });
      });
    }

    // Animate report in
    reportSection.style.display = 'block';
    reportSection.classList.add('visible');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reportSection.classList.add('animated');
      });
    });

    // Scroll to report
    setTimeout(() => {
      reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  });

  // ── Reset ──
  btnReset.addEventListener('click', () => {
    gameNameInput.value = '';
    notesInput.value    = '';

    // Reset sliders to 3.0
    CRITERIA.forEach((c) => {
      const input   = document.getElementById(`slider-${c.id}`);
      const display = document.getElementById(`val-${c.id}`);
      if (input) {
        input.value = 3.0;
        display.textContent = '3.0';
        const pct = ((3.0 - 1) / 4) * 100;
        input.style.setProperty('--pct', pct + '%');
      }
    });

    // Uncheck all conditions
    CONDITIONS.forEach((cond) => {
      const cb    = document.getElementById(`cond-${cond.id}`);
      const label = cb?.closest('label');
      if (cb) {
        cb.checked = false;
        label?.classList.remove('checked');
      }
    });

    // Clear active example
    exampleBtns.forEach((b) => b.classList.remove('active'));
    activeExampleKey = null;

    // Hide report
    reportSection.classList.remove('visible', 'animated');
    setTimeout(() => { reportSection.style.display = 'none'; }, 400);

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();