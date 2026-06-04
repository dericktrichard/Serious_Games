(function(){
  // Client-side remote-sync override for analytics.js
  if (!window.SGDF) window.SGDF = {};
  const REMOTE = () => (window.SGDF && window.SGDF.REMOTE_ANALYTICS_URL) ? String(window.SGDF.REMOTE_ANALYTICS_URL).replace(/\/+$/,'') : null;

  async function sendRemote(entry) {
    const base = REMOTE(); if (!base) throw new Error('no-remote');
    const res = await fetch(base + '/events', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(entry) });
    if (!res.ok) throw new Error('post-failed');
    return res.json();
  }

  async function fetchRemote() {
    const base = REMOTE(); if (!base) return null;
    const res = await fetch(base + '/events'); if (!res.ok) throw new Error('fetch-failed');
    return res.json();
  }

  function enqueuePending(entry) {
    try {
      const k = 'sgdf_evals_pending';
      const arr = JSON.parse(localStorage.getItem(k) || '[]'); arr.push(entry); localStorage.setItem(k, JSON.stringify(arr));
    } catch (e) { console.warn('enqueue failed', e); }
  }

  async function syncPending() {
    const base = REMOTE(); if (!base) return;
    try {
      const k = 'sgdf_evals_pending';
      const arr = JSON.parse(localStorage.getItem(k) || '[]');
      const remaining = [];
      for (const e of arr) {
        try { await sendRemote(e); } catch (er) { remaining.push(e); }
      }
      localStorage.setItem(k, JSON.stringify(remaining));
    } catch (e) { console.warn('sync pending failed', e); }
  }

  window.addEventListener && window.addEventListener('online', () => { setTimeout(syncPending, 1200); });

  // Wrap saveEvaluation to try remote push
  if (window.SGDF && typeof window.SGDF.saveEvaluation === 'function') {
    const origSave = window.SGDF.saveEvaluation;
    window.SGDF.saveEvaluation = function(payload) {
      const entry = origSave(payload);
      // Try remote push (don't block UX)
      (async () => {
        try {
          const base = REMOTE();
          if (!base) return;
          await sendRemote(entry);
          // attempt to sync any pending
          await syncPending();
        } catch (e) {
          enqueuePending(entry);
        }
      })();
      return entry;
    };
  }

  // Enhance admin rendering: after original render, fetch remote and re-render using remote data
  if (window.SGDF && typeof window.SGDF.renderAdminDashboard === 'function' && typeof window.SGDF.loadEvaluations === 'function') {
    const origRender = window.SGDF.renderAdminDashboard;
    const origLoad = window.SGDF.loadEvaluations;
    window.SGDF.renderAdminDashboard = function(container, criteria, conditions) {
      // Render local first
      origRender(container, criteria, conditions);
      // Then try to fetch remote entries and re-render with those
      (async () => {
        try {
          const remote = await fetchRemote();
          if (!remote || !remote.length) return;
          // Temporarily override loadEvaluations used by the renderer
          window.SGDF.loadEvaluations = () => remote;
          try { origRender(container, criteria, conditions); }
          finally { window.SGDF.loadEvaluations = origLoad; }
        } catch (e) {
          // ignore remote failures
        }
      })();
    };
  }

})();
