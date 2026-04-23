window.SGDF = window.SGDF || {};

/* ── Slider track background update ── */
function updateSliderTrack(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--pct', pct + '%');
}

/* ── Build criteria sliders ── */
function buildCriteriaSliders(container, criteria) {
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'criteria-list';

  criteria.forEach((c, idx) => {
    const item = document.createElement('div');
    item.className = 'criterion-item';

    item.innerHTML = `
      <div class="criterion-header">
        <span class="criterion-name">${c.name}</span>
        <span class="criterion-weight">weight ×${c.weight}</span>
      </div>
      <div class="criterion-anchors">
        <span class="anchor-lo">${c.lo}</span>
        <span class="anchor-hi">${c.hi}</span>
      </div>
      <div class="slider-row">
        <input
          type="range"
          id="slider-${c.id}"
          data-idx="${idx}"
          min="1" max="5" step="0.1" value="3.0"
          aria-label="${c.name} score"
        />
        <span class="slider-value" id="val-${c.id}">3.0</span>
      </div>
    `;

    list.appendChild(item);
  });

  container.appendChild(list);

  // Wire up events after insertion
  criteria.forEach((c) => {
    const input = document.getElementById(`slider-${c.id}`);
    const display = document.getElementById(`val-${c.id}`);
    updateSliderTrack(input);

    input.addEventListener('input', () => {
      display.textContent = parseFloat(input.value).toFixed(1);
      updateSliderTrack(input);
    });
  });
}

/* ── Build conditions checklist ── */
function buildConditionsChecklist(container, conditions) {
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'conditions-list';

  conditions.forEach((cond) => {
    const label = document.createElement('label');
    label.className = 'condition-item';
    label.setAttribute('for', `cond-${cond.id}`);

    label.innerHTML = `
      <input type="checkbox" id="cond-${cond.id}" data-id="${cond.id}">
      <span class="condition-check">✓</span>
      <span class="condition-text">
        <span class="condition-name">${cond.name}</span>
        <span class="condition-desc">${cond.desc}</span>
      </span>
    `;

    list.appendChild(label);

    const cb = label.querySelector('input[type=checkbox]');
    cb.addEventListener('change', () => {
      label.classList.toggle('checked', cb.checked);
    });
  });

  container.appendChild(list);
}

/* ── Collect current scores from sliders ── */
function collectScores(criteria) {
  return criteria.map((c) => parseFloat(document.getElementById(`slider-${c.id}`).value));
}

/* ── Collect current conditions ── */
function collectConditions(conditions) {
  return conditions.map((c) => document.getElementById(`cond-${c.id}`).checked);
}

/* ── Set slider values programmatically (e.g. from example) ── */
function setSliderValues(criteria, scores) {
  criteria.forEach((c, i) => {
    const input = document.getElementById(`slider-${c.id}`);
    const display = document.getElementById(`val-${c.id}`);
    if (!input) return;
    input.value = scores[i];
    display.textContent = scores[i].toFixed(1);
    updateSliderTrack(input);
  });
}

/* ── Set condition checkboxes ── */
function setConditionValues(conditions, values) {
  conditions.forEach((c, i) => {
    const cb = document.getElementById(`cond-${c.id}`);
    const label = cb?.closest('label');
    if (!cb) return;
    cb.checked = values[i];
    label?.classList.toggle('checked', values[i]);
  });
}

/* ── Render the full report card ── */
function renderReport({
  reportSection,
  gameName,
  score,
  verdict,
  scores,
  criteria,
  conditionsArr,
  conditionDefs,
  notes,
}) {
  const { getScoreBarColors, criterionColor, buildConclusionText } = window.SGDF;

  const [cs, ce] = getScoreBarColors(verdict);
  const fillPct = ((score - 1) / 4) * 100; // map 1–5 range to 0–100%

  const unmetCount = conditionsArr.filter(Boolean).length;

  // ── Criterion breakdown rows ──
  const breakdownRows = criteria.map((c, i) => {
    const pct = ((scores[i] - 1) / 4) * 100;
    const color = criterionColor(scores[i]);
    return `
      <div class="breakdown-item">
        <span class="breakdown-name">${c.name}</span>
        <span class="breakdown-score">${scores[i].toFixed(1)}</span>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
      </div>
    `;
  }).join('');

  // ── Conditions rows ──
  const conditionRows = conditionDefs.map((cd, i) => {
    const met = conditionsArr[i];
    return `
      <div class="condition-report-item ${met ? 'met' : 'unmet'}">
        <span class="condition-icon">${met ? '✓' : '✗'}</span>
        <span class="condition-report-name">${cd.name}</span>
      </div>
    `;
  }).join('');

  const conclusionText = buildConclusionText({
    gameName, score, verdict, conditions: conditionsArr, conditionDefs, notes,
  });

  // ── Assemble HTML ──
  reportSection.innerHTML = `
    <div class="card">
      <div class="card-title">Diagnostic Report</div>

      <div class="report-header">
        <div class="report-title-label">Subject Under Review</div>
        <div class="report-game-name">${escapeHtml(gameName)}</div>
      </div>

      <div class="score-display">
        <div class="score-number-block">
          <div class="score-big">${score.toFixed(2)}</div>
          <div class="score-denom">out of 5.00</div>
        </div>
        <div class="score-bar-block">
          <div class="score-bar-track">
            <div class="score-bar-fill" id="score-bar-fill"
              style="width:0%;--fill-color-start:${cs};--fill-color-end:${ce};background:linear-gradient(90deg,${cs},${ce});">
            </div>
          </div>
          <div class="score-bar-labels"><span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span><span>5.0</span></div>
        </div>
      </div>

      <div>
        <span class="verdict-badge ${verdict.cssClass}">
          <span class="verdict-dot"></span>
          ${verdict.label}
        </span>
      </div>

      <div class="section-divider"></div>

      <div class="card-title">Criterion Breakdown</div>
      <div class="breakdown-list">${breakdownRows}</div>

      <div class="section-divider"></div>

      <div class="card-title">Non-Negotiable Conditions</div>
      <div class="conditions-report">${conditionRows}</div>

      <div class="section-divider"></div>

      <div class="card-title">Conclusion</div>
      <div class="conclusion-text">${formatConclusion(conclusionText, gameName)}</div>

      <div class="section-divider"></div>

      <div class="export-row">
        <button class="btn-export" id="btn-copy">
          <span>⎘</span> Copy Report to Clipboard
        </button>
        <span class="copy-feedback" id="copy-feedback">Copied!</span>
      </div>
    </div>
  `;

  // Animate score bar after brief delay
  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('score-bar-fill');
      if (fill) fill.style.width = fillPct + '%';
    }, 80);
  });
}

/* ── Highlight game name in conclusion ── */
function formatConclusion(text, gameName) {
  const escaped = escapeHtml(text);
  const nameEsc = escapeHtml(gameName);
  // Bold the game name occurrences
  return escaped.replace(new RegExp(nameEsc, 'g'), `<em>${nameEsc}</em>`);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.SGDF.buildCriteriaSliders = buildCriteriaSliders;
window.SGDF.buildConditionsChecklist = buildConditionsChecklist;
window.SGDF.collectScores = collectScores;
window.SGDF.collectConditions = collectConditions;
window.SGDF.setSliderValues = setSliderValues;
window.SGDF.setConditionValues = setConditionValues;
window.SGDF.renderReport = renderReport;