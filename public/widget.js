/* TalentNest Career Widget v1.0
 * Drop-in embeddable widget for organisation career pages.
 * Usage: <div id="tn-careers-widget" data-org="your-org-slug"></div>
 *        <script src="https://talentnesthr.com/widget.js" data-org="your-org-slug" async></script>
 */
(function () {
  'use strict';

  var SITE = (function () {
    var scripts = document.querySelectorAll('script[data-org]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      var m = src.match(/^(https?:\/\/[^\/]+)/);
      if (m) return m[1];
    }
    return 'https://talentnesthr.com';
  })();

  var currentScript = document.currentScript || (function () {
    var scripts = document.querySelectorAll('script[data-org]');
    return scripts[scripts.length - 1];
  })();

  var orgSlug    = (currentScript && currentScript.getAttribute('data-org')) || '';
  var containerId = (currentScript && currentScript.getAttribute('data-container')) || 'tn-careers-widget';
  var theme       = (currentScript && currentScript.getAttribute('data-theme')) || 'light';

  if (!orgSlug) { console.warn('[TalentNest Widget] data-org attribute is required.'); return; }

  var container = document.getElementById(containerId);
  if (!container) { console.warn('[TalentNest Widget] Container #' + containerId + ' not found.'); return; }

  /* ── Styles ────────────────────────────────────────────────────────────── */
  var isDark = theme === 'dark';
  var css = [
    '#tn-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px 16px}',
    '#tn-widget *{box-sizing:border-box}',
    '#tn-widget .tn-header{text-align:center;margin-bottom:32px}',
    '#tn-widget .tn-header h2{font-size:28px;font-weight:800;color:' + (isDark ? '#fff' : '#0A1628') + ';margin:0 0 8px}',
    '#tn-widget .tn-header p{color:' + (isDark ? '#94A3B8' : '#64748B') + ';font-size:14px;margin:0}',
    '#tn-widget .tn-search{display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap}',
    '#tn-widget .tn-search input{flex:1;min-width:200px;padding:12px 16px;border-radius:10px;border:1.5px solid ' + (isDark ? '#334155' : '#E2E8F0') + ';background:' + (isDark ? '#1E293B' : '#F8FAFF') + ';color:' + (isDark ? '#fff' : '#181818') + ';font-size:14px;outline:none}',
    '#tn-widget .tn-search input:focus{border-color:#0176D3}',
    '#tn-widget .tn-search select{padding:12px 16px;border-radius:10px;border:1.5px solid ' + (isDark ? '#334155' : '#E2E8F0') + ';background:' + (isDark ? '#1E293B' : '#F8FAFF') + ';color:' + (isDark ? '#fff' : '#181818') + ';font-size:13px;cursor:pointer;outline:none}',
    '#tn-widget .tn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}',
    '#tn-widget .tn-card{background:' + (isDark ? '#1E293B' : '#fff') + ';border:1px solid ' + (isDark ? '#334155' : '#E2E8F0') + ';border-radius:16px;padding:20px;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;display:block}',
    '#tn-widget .tn-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,0.1);border-color:#0176D3}',
    '#tn-widget .tn-card .tn-role{font-size:15px;font-weight:800;color:' + (isDark ? '#fff' : '#0A1628') + ';margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#tn-widget .tn-card .tn-company{font-size:13px;color:#0176D3;font-weight:700;margin:0 0 8px}',
    '#tn-widget .tn-card .tn-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
    '#tn-widget .tn-meta span{font-size:11px;color:' + (isDark ? '#94A3B8' : '#64748B') + ';background:' + (isDark ? '#334155' : '#F1F5F9') + ';padding:3px 8px;border-radius:6px;font-weight:600}',
    '#tn-widget .tn-skills{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px}',
    '#tn-widget .tn-skill{font-size:10px;font-weight:700;color:#0176D3;background:rgba(1,118,211,0.08);border:1px solid rgba(1,118,211,0.15);padding:2px 8px;border-radius:20px}',
    '#tn-widget .tn-apply-btn{display:block;width:100%;padding:10px;background:linear-gradient(135deg,#0176D3,#014486);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:0.3px;transition:opacity 0.2s}',
    '#tn-widget .tn-apply-btn:hover{opacity:0.9}',
    '#tn-widget .tn-urgency-high{border-left:3px solid #BA0517 !important}',
    '#tn-widget .tn-urgency-med{border-left:3px solid #F59E0B !important}',
    '#tn-widget .tn-count{text-align:center;color:' + (isDark ? '#94A3B8' : '#64748B') + ';font-size:12px;margin-top:20px;font-weight:600}',
    '#tn-widget .tn-empty{text-align:center;padding:60px 20px;color:' + (isDark ? '#64748B' : '#94A3B8') + '}',
    '#tn-widget .tn-empty .tn-empty-icon{font-size:48px;margin-bottom:12px}',
    '#tn-widget .tn-loading{text-align:center;padding:60px;color:' + (isDark ? '#64748B' : '#94A3B8') + ';font-size:14px}',
    '#tn-widget .tn-powered{text-align:center;margin-top:24px;font-size:11px;color:' + (isDark ? '#475569' : '#CBD5E1') + '}',
    '#tn-widget .tn-powered a{color:#0176D3;text-decoration:none;font-weight:700}',
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ── Markup skeleton ────────────────────────────────────────────────────── */
  container.innerHTML = [
    '<div id="tn-widget">',
    '  <div class="tn-header"><h2>Open Positions</h2><p>Join our team — explore current opportunities</p></div>',
    '  <div class="tn-search">',
    '    <input id="tn-search-q" type="text" placeholder="Search roles, skills, location…" />',
    '    <select id="tn-filter-type"><option value="">All Types</option><option>Full-Time</option><option>Part-Time</option><option>Contract</option><option>Internship</option></select>',
    '    <select id="tn-filter-loc"><option value="">All Locations</option></select>',
    '  </div>',
    '  <div id="tn-jobs-grid" class="tn-grid"><div class="tn-loading">⏳ Loading positions…</div></div>',
    '  <div id="tn-jobs-count" class="tn-count"></div>',
    '  <div class="tn-powered">Powered by <a href="https://talentnesthr.com" target="_blank" rel="noopener">TalentNest HR</a></div>',
    '</div>',
  ].join('');

  var allJobs = [];

  /* ── Fetch jobs ─────────────────────────────────────────────────────────── */
  function fetchJobs() {
    var url = SITE + '/api/jobs/public/org/' + encodeURIComponent(orgSlug);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          var jobs = Array.isArray(data) ? data : (data.data || []);
          allJobs = jobs.filter(function (j) { return j.status !== 'closed' && !j.deletedAt; });
          populateFilters();
          renderJobs(allJobs);
        } catch (e) { showError('Could not load jobs.'); }
      } else {
        showError('Could not connect. Please try again.');
      }
    };
    xhr.send();
  }

  function populateFilters() {
    var locs = [];
    allJobs.forEach(function (j) { if (j.location && locs.indexOf(j.location) === -1) locs.push(j.location); });
    var sel = document.getElementById('tn-filter-loc');
    if (!sel) return;
    locs.sort().forEach(function (l) {
      var opt = document.createElement('option'); opt.value = l; opt.textContent = l; sel.appendChild(opt);
    });
  }

  function renderJobs(jobs) {
    var grid = document.getElementById('tn-jobs-grid');
    var count = document.getElementById('tn-jobs-count');
    if (!grid) return;
    if (jobs.length === 0) {
      grid.innerHTML = '<div class="tn-empty"><div class="tn-empty-icon">🔍</div><p style="font-weight:700;font-size:15px">No open positions match your search</p><p style="font-size:13px">Try adjusting your filters or check back soon</p></div>';
      if (count) count.textContent = '';
      return;
    }
    if (count) count.textContent = jobs.length + ' open position' + (jobs.length !== 1 ? 's' : '');
    grid.innerHTML = jobs.map(function (j) {
      var id = j.id || j._id || '';
      var url = SITE + '/careers/apply/' + (j.seoSlug || j.careerPageSlug || id);
      var skills = Array.isArray(j.skills) ? j.skills.slice(0, 4) : (String(j.skills || '')).split(',').map(function(s){return s.trim();}).filter(Boolean).slice(0, 4);
      var urgClass = j.urgency === 'High' ? 'tn-urgency-high' : j.urgency === 'Medium' ? 'tn-urgency-med' : '';
      return [
        '<a class="tn-card ' + urgClass + '" href="' + url + '" target="_blank" rel="noopener">',
        '  <div class="tn-role">' + esc(j.title || '—') + '</div>',
        '  <div class="tn-company">' + esc(j.companyName || j.company || '') + '</div>',
        '  <div class="tn-meta">',
        j.location ? '<span>📍 ' + esc(j.location) + '</span>' : '',
        j.experience ? '<span>⏱ ' + esc(j.experience) + '</span>' : '',
        j.jobType ? '<span>' + esc(j.jobType) + '</span>' : '',
        j.urgency === 'High' ? '<span style="color:#BA0517;background:rgba(186,5,23,0.08)">🔥 Urgent</span>' : '',
        '  </div>',
        skills.length ? '<div class="tn-skills">' + skills.map(function(s){ return '<span class="tn-skill">' + esc(s) + '</span>'; }).join('') + '</div>' : '',
        '  <button class="tn-apply-btn">Apply Now →</button>',
        '</a>',
      ].join('');
    }).join('');
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showError(msg) {
    var grid = document.getElementById('tn-jobs-grid');
    if (grid) grid.innerHTML = '<div class="tn-empty"><div class="tn-empty-icon">⚠️</div><p>' + esc(msg) + '</p></div>';
  }

  /* ── Live search & filter ───────────────────────────────────────────────── */
  function getFiltered() {
    var q = (document.getElementById('tn-search-q') || {}).value || '';
    var type = (document.getElementById('tn-filter-type') || {}).value || '';
    var loc  = (document.getElementById('tn-filter-loc') || {}).value || '';
    var ql = q.toLowerCase().trim();
    return allJobs.filter(function (j) {
      if (type && (j.jobType || '').toLowerCase() !== type.toLowerCase()) return false;
      if (loc  && (j.location || '') !== loc) return false;
      if (!ql) return true;
      var haystack = [j.title, j.companyName, j.company, (j.skills || []).join(' '), j.location, j.description].join(' ').toLowerCase();
      return haystack.includes(ql);
    });
  }

  function onFilter() { renderJobs(getFiltered()); }

  /* ── Wire up events after DOM is ready ─────────────────────────────────── */
  function init() {
    var searchEl = document.getElementById('tn-search-q');
    var typeEl   = document.getElementById('tn-filter-type');
    var locEl    = document.getElementById('tn-filter-loc');
    var t;
    if (searchEl) searchEl.addEventListener('input', function () { clearTimeout(t); t = setTimeout(onFilter, 250); });
    if (typeEl)   typeEl.addEventListener('change', onFilter);
    if (locEl)    locEl.addEventListener('change', onFilter);
    fetchJobs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
