/* Research Conclusions Atlas core (24 Nov 2026). One classic script shared by the page builder (tools/reports-view.mjs
   runs it in Node) and the browser (assets/reports.js): number formatting with native units and qualifiers, and the
   finding passport. A value is always shown with its unit, qualifier, geography, scope, denominator, horizon and
   scenario as the report states them; nothing is converted, rounded into another unit or averaged. */
(function (root) {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var isNum = function (v) { return typeof v === 'number' && isFinite(v); };

  // 1,200,000 -> "1.2 million"; 554e9 USD -> "US$554 billion"; 0.3 % -> "0.3%".
  var big = function (v) {
    var a = Math.abs(v);
    var f = function (x, w) { return Number(x.toFixed(x < 10 ? 2 : 1)).toLocaleString('en-GB') + ' ' + w; };
    if (a >= 1e12) return f(v / 1e12, 'trillion');
    if (a >= 1e9) return f(v / 1e9, 'billion');
    if (a >= 1e6) return f(v / 1e6, 'million');
    return Number(v.toFixed(2)).toLocaleString('en-GB');
  };
  var fmt = function (v, unit, currency) {
    if (!isNum(v)) return '';
    if (unit === '%' || /^%/.test(unit || '')) return Number(v.toFixed(2)).toLocaleString('en-GB') + unit;
    if (currency === 'USD' || /^USD/.test(unit || '')) {
      var per = String(unit || '').replace(/^USD\s*/, '');
      return 'US$' + big(v) + (per ? ' ' + per : '');
    }
    return big(v) + (unit ? ' ' + unit : '');
  };
  var compact = function (v, usd) {
    var a = Math.abs(v), s;
    if (a >= 1e12) s = (v / 1e12) + 'T'; else if (a >= 1e9) s = (v / 1e9) + 'B'; else if (a >= 1e6) s = (v / 1e6) + 'M'; else if (a >= 1e3) s = (v / 1e3) + 'k'; else s = String(v);
    s = s.replace(/(\.\d)\d+/, '$1');
    return (usd ? '$' : '') + s;
  };
  var QUAL = { 'more than': 'more than ', 'about': 'about ', 'below': 'below ', 'up to': 'up to ', 'range': '', 'span of published forecasts': '' };
  // The finding's figure, as the report states it.
  var valueText = function (f) {
    if (isNum(f.min) && isNum(f.max)) {
      // "US$10 billion" + "US$25 billion" -> "US$10 to US$25 billion": the min drops only the trailing words both ends share.
      var a = fmt(f.min, f.unit, f.currency).split(' '), b = fmt(f.max, f.unit, f.currency).split(' '), k = 0;
      while (k < a.length - 1 && k < b.length - 1 && a[a.length - 1 - k] === b[b.length - 1 - k]) k++;
      return (QUAL[f.qualifier] || '') + a.slice(0, a.length - k).join(' ') + ' to ' + b.join(' ');
    }
    if (isNum(f.value)) return (QUAL[f.qualifier] || '') + fmt(f.value, f.unit, f.currency);
    if (f.points && f.points.length) return f.points.map(function (p) { return p.label + ': ' + (isNum(p.of) ? p.value + ' of ' + p.of : fmt(p.value, f.unit, f.currency)); }).join('; ');
    return '';
  };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var dateText = function (d) { var x = String(d || '').split('-'); return x[2] ? Number(x[2]) + ' ' + MONTHS[x[1] - 1] + ' ' + x[0] : x[1] ? MONTHS[x[1] - 1] + ' ' + x[0] : x[0] || 'not stated'; };
  var CHECK = {
    verified: ['ok', 'Checked against the original'], pending: ['pending', 'Extracted, not yet checked'],
    pending_unreachable: ['gap', 'Original not reachable; as extracted'], withheld: ['gap', 'Withheld: ambiguous extraction']
  };
  var badge = function (f) { var c = CHECK[f.check.status] || ['gap', f.check.status]; return '<span class="ck ck-' + c[0] + '">' + esc(c[1]) + '</span>'; };
  var kv = function (pairs) {
    return '<dl class="fp-kv">' + pairs.filter(function (p) { return p[1] !== null && p[1] !== undefined && p[1] !== ''; }).map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd>'; }).join('') + '</dl>';
  };
  // The passport of one finding. `reports` maps report id -> report; `vocab` is the snapshot vocabulary.
  var passport = function (f, reports, vocab, opts) {
    opts = opts || {};
    var r = reports[f.report] || {};
    var h = opts.level || 3;
    var v = valueText(f);
    var parts = f.parts ? '<ul class="fp-parts">' + f.parts.map(function (p) { return '<li><span>' + esc(p[0]) + '</span><b>' + esc(f.parts_total ? fmt(p[1], 'USD', 'USD').replace(' USD', '') : p[1] + '%') + '</b></li>'; }).join('') + '</ul><p class="fp-note">' + esc(f.parts_check || '') + '</p>' : '';
    var appears = f.appears_in && f.appears_in.length > 1 ? 'The same original estimate appears in ' + f.appears_in.length + ' reports: ' + f.appears_in.map(function (id) { return esc((reports[id] || {}).short || id); }).join(', ') + '. It counts once.' : null;
    var years = [f.reference_year ? 'published ' + f.reference_year : null, f.target_year ? 'refers to ' + f.target_year : null].filter(Boolean).join(', ');
    return '<article class="fp" id="f-' + esc(f.id) + '" data-f="' + esc(f.id) + '">'
      + '<p class="fp-k">' + esc((vocab.themes.filter(function (t) { return t.key === f.theme; })[0] || { label: 'Headline' }).label) + ' · ' + esc(vocab.kinds[f.kind] || f.kind) + ' ' + badge(f) + '</p>'
      + (v ? '<p class="fp-v">' + esc(v) + '</p>' : '')
      + '<h' + h + ' class="fp-s">' + esc(f.statement) + '</h' + h + '>'
      + parts
      + kv([
        ['Report', '<a href="/reports/' + esc(r.slug) + '/">' + esc(r.title) + '</a> · ' + esc(r.publisher) + ' · ' + esc(dateText(r.published))],
        ['Original estimate by', f.attribution ? esc(f.attribution) : null],
        ['Measure', esc(vocab.metrics[f.metric] || f.metric)],
        ['Unit', f.unit ? esc(f.unit) + (f.currency ? ' (' + esc(f.currency) + ', as stated, not converted)' : '') : null],
        ['Denominator', f.denominator ? esc(f.denominator) : null],
        ['Geography', f.geography ? esc(f.geography) : null],
        ['Scope', f.scope ? esc(f.scope) : null],
        ['Years', years ? esc(years) : null],
        ['Scenario', f.scenario ? esc(f.scenario) : null],
        ['Sample', f.sample ? esc(f.sample) : null],
        ['Assumptions', f.assumptions ? esc(f.assumptions) : null],
        ['Limits', f.limits ? esc(f.limits) : null],
        ['Repeated', appears],
        ['Where', esc(f.locator || 'Not located') + (f.source_url ? ' · <a href="' + esc(f.source_url) + '" rel="noopener noreferrer">Original ↗</a>' : '')],
        ['Checked', f.check.status === 'verified' ? 'Phrase found in the original: “' + esc(f.check.phrase) + '” · checked ' + esc(dateText(f.check.checked_on)) : esc((CHECK[f.check.status] || [0, ''])[1])],
        ['Master cell', 'Reports row ' + esc(f.cell.row) + ', column ' + esc(f.cell.column) + ' (' + esc(f.cell.header) + '): “' + esc(f.cell.excerpt) + '”']
      ])
      + '<p class="fp-id">Finding ' + esc(f.id) + ' · <a href="/reports/?f=' + esc(f.id) + '#findings">Shareable link</a></p>'
      + '</article>';
  };
  root.WHReports = { dateText: dateText, esc: esc, isNum: isNum, fmt: fmt, compact: compact, valueText: valueText, badge: badge, passport: passport, CHECK: CHECK };
}(typeof window !== 'undefined' ? window : globalThis));
