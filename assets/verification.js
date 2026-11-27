// Progressive enhancement: the source evidence remains readable without JavaScript.
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var tiers = ['V0_Unverified','V1_OEM_Claim','V2_Technical_Doc','V3_Corroborated','V4_Audited'];
  var today = new Date().toISOString().slice(0,10), todayMs = Date.parse(today);
  var fresh = function (tier, reviewed) {
    if (!reviewed || !Number.isFinite(Date.parse(reviewed))) return {state:'not_reviewed',visual_tier:'Pending_Audit'};
    var age = Math.floor((todayMs - Date.parse(String(reviewed).slice(0,10))) / 86400000), n = /^V[0-4]_/.test(tier || '') ? Number(tier[1]) : -1;
    if (age < 0) return {state:'not_reviewed',visual_tier:'Pending_Audit'};
    return {state:age <=180 ? 'fresh' : age <=365 ? 'review_due' : 'stale',age_days:age,visual_tier:age >365 && n>0 ? tiers[n-1] : tier};
  };
  document.querySelectorAll('[data-reviewed-at]').forEach(function (el) {
    var f = fresh(el.dataset.evidenceTier,el.dataset.reviewedAt);
    el.innerHTML = f.state === 'stale' ? '<span class="verification-fresh vf-stale">Stale: re-verification overdue · comparison display ' + esc(f.visual_tier) + '</span>' : f.state === 'review_due' ? '<span class="verification-fresh vf-review">Requires re-verification</span>' : '';
  });
  document.querySelectorAll('[data-freshness-date]').forEach(function (el) { el.textContent=today; });
  var blob = document.getElementById('verification-comparison-data');
  if (blob) {
    var rows = JSON.parse(blob.textContent), field = document.getElementById('verification-metric'), only = document.getElementById('verification-v2'), out = document.getElementById('verification-comparison-output'), status = document.getElementById('verification-comparison-status');
    rows.forEach(function (r) { Object.keys(r.metrics).forEach(function (key) { var m=r.metrics[key]; m.freshness=fresh(m.verification_tier,m.verified_at); }); });
    var show = function () {
      var selected = field.value;
      var all = rows.filter(function (r) { var m = r.metrics[selected]; return m && m.status === 'source_reported' && typeof m.value === 'number' && Number.isFinite(m.value); });
      var eligible = all.filter(function (r) { var m = r.metrics[selected]; return !only.checked || /^V[2-4]_/.test(m.freshness && m.freshness.visual_tier || m.verification_tier || ''); });
      var groups = new Set(eligible.map(function (r) { var m = r.metrics[selected]; return m.comparability_group || m.comparison_group || JSON.stringify(m.conditions || null); }));
      var unknown = eligible.some(function (r) { var m = r.metrics[selected], c = m.conditions; return !m.comparison_group || !c || (typeof c === 'object' && !Object.keys(c).length); });
      status.textContent = eligible.length + ' of ' + rows.length + ' robots have an eligible value for this exact metric. ' + (groups.size > 1 || unknown ? 'Conditions differ or are incomplete: these values do not establish a common performance ranking.' : eligible.length ? 'Values are listed alphabetically. Check the stated conditions before comparing.' : 'No eligible evidence is recorded. A missing value is not zero.');
      if (!eligible.length) { out.innerHTML = '<p class="verification-empty">No eligible values for this metric and evidence filter. Legacy generic payload and runtime claims are excluded. Open a robot profile to inspect its original claims and pending evidence.</p>'; return; }
      eligible.sort(function (a, b) { return a.name.localeCompare(b.name) || a.maker.localeCompare(b.maker); });
      out.innerHTML = '<table><caption class="sr">' + esc(field.options[field.selectedIndex].text) + ', without a cross-protocol ranking</caption><thead><tr><th scope="col">Robot</th><th scope="col">Value</th><th scope="col">Evidence tier</th><th scope="col">Conditions and review</th></tr></thead><tbody>' + eligible.map(function (r) { var m = r.metrics[selected], c = typeof m.conditions === 'object' ? JSON.stringify(m.conditions) : m.conditions; var fresh = m.freshness, fs = typeof fresh === 'string' ? fresh : fresh && (fresh.status || fresh.state); var warn = /stale|obsolete/.test(fs || '') ? ' · Stale: re-verification overdue' : /review/.test(fs || '') ? ' · Requires re-verification' : ''; return '<tr><th scope="row"><a href="' + esc(r.path) + '#verification">' + esc(r.name) + '</a><br><span class="dim">' + esc(r.maker) + '</span></th><td>' + esc(m.value) + ' ' + esc(m.unit || (/_kg$/.test(selected) ? 'kg' : 'h')) + '</td><td>' + esc(m.verification_tier) + '</td><td>' + esc(c || 'Conditions not disclosed') + '<br>Source reviewed: ' + esc(m.verified_at || 'Not recorded') + esc(warn) + '</td></tr>'; }).join('') + '</tbody></table>';
    };
    field.addEventListener('change', show); only.addEventListener('change', show); show();
  }
  var form = document.getElementById('verification-correction');
  if (form) {
    var entity = new URLSearchParams(location.search).get('entity');
    if (entity) form.elements.entity.value = entity.slice(0, 500);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var content = ['Entity: ' + form.elements.entity.value, 'Attribute: ' + form.elements.attribute.value, 'Public evidence: ' + form.elements.source_url.value, 'Correction, model, conditions and date:\n' + form.elements.evidence.value, 'Relationship to subject: ' + form.elements.relationship.value].join('\n\n');
      var mail = 'mailto:javier@integrarobot.com?subject=' + encodeURIComponent('Why Humanoid? evidence correction: ' + form.elements.attribute.value) + '&body=' + encodeURIComponent(content);
      document.getElementById('verification-correction-status').innerHTML = 'Email prepared. Your email app must send it. If it did not open, <a href="' + esc(mail) + '">open the prepared email</a> or contact javier@integrarobot.com.';
      location.href = mail;
    });
  }
}());
