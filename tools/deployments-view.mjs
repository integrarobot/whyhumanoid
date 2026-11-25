// Deployments, complete public listing (Javier, 24 Nov 2026): every deployment case with its public summary, basic
// search and filters, adoption views from the same cases, and one permanent page per case (/deployments/<slug>/).
// Built only from the public Deployments rows (data/preview/deployments.json: the fields of server/src/access/fields.js)
// grouped by server/src/public/cases.js. The paid detail of each case (site, task description, workflow, integration,
// timeline, metrics, claims, evidence relations, confidence, open questions) is never read here: it is not in the input.

import { CASE_CAVEAT, ROLE_LABELS, robotText } from '../server/src/public/cases.js';
import { STATUS_KEYS, STATUS_LABELS } from '../server/src/public/projection.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const human = (v) => String(v ?? '').replace(/_/g, ' ');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const sectorLabel = (v) => cap(human(v));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayText = (d) => { const [y, m, day] = String(d ?? '').split('-'); return day ? `${Number(day)} ${MONTHS[m - 1]} ${y}` : m ? `${MONTHS[m - 1]} ${y}` : y || 'date not recorded'; };
export const casePath = (c) => `/deployments/${c.slug}/`;

// Paid detail, named the same way on every page so a reader knows what the subscription adds to a case.
export const PAID_CASE = ['site, city, region and environment', 'commercial relationship where documented', 'the full task description and workflow (from and to)', 'integration dependencies', 'the detailed timeline and every source claim', 'metrics with operator, value, unit, period and conditions', 'claim and evidence relations', 'confidence and review notes', 'discrepancies and open questions'];

const statusBadge = (c) => `<span class="st ${esc(c.status.key)}">${esc(c.status.detail)}</span>`;
// The tie-break, said next to the status (Codex review, 25 Nov 2026): the latest sources disagree, or their dates
// overlap, and the most advanced of their statuses is shown. Not new evidence of operation.
export const tieNote = (c) => (!c.status.dated ? 'Every source of this case is undated: its status is the most advanced one recorded, not a current status by date.'
  : c.status.tie ? `The latest sources disagree (${c.status.latest.map((x) => `${x.date}: ${STATUS_LABELS[x.key].toLowerCase()}`).join('; ')})${c.status.order === 'ambiguous' ? ' and their dates overlap, so their order is not known' : ''}; the most advanced is shown. This is a reading rule, not new evidence.`
    : c.status.order === 'ambiguous' ? 'The latest sources\' dates overlap (a year or month and a day inside it), so their order is not known; they agree on this status.' : null);
const countryText = (c) => [...c.countries, ...(c.country_multiple ? ['several countries, not named'] : [])].join(', ') || 'not disclosed or not confirmed';
const orgHtml = (o, links) => {
  const path = links.company(o.id);
  return `${path ? `<a href="${path}">${esc(o.name)}</a>` : esc(o.name ?? 'Organisation not recorded')} <span class="dim">${esc((ROLE_LABELS[o.role] ?? human(o.role ?? 'organisation')).toLowerCase())}${o.country ? `, ${esc(o.country)}` : ''}</span>`;
};
const robotHtml = (c, links) => {
  const own = links.robots(c);
  return `${esc(robotText(c))}${own.length ? ` · ${own.map((r) => `<a href="${r.path}">${esc(r.name)}${r.family ? ' (model line)' : ''}</a>`).join(', ')}` : ''}`;
};
const sourcesHtml = (c) => `<ul class="dc-src">${c.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.publisher || host(s.url))} ↗</a>` : esc(s.publisher || 'Source without a link')}${s.title ? ` <span class="dim">${esc(s.title)}</span>` : ''} <span class="dim">· ${esc(s.date ? dayText(s.date) : 'date not recorded')}</span></li>`).join('')}</ul>`;

// One case as a card: the public summary in full, with its sources and its review state.
export function caseCard(c, links, { level = 3 } = {}) {
  const text = [c.organisations.map((o) => o.name).join(' '), robotText(c), c.sectors.map(sectorLabel).join(' '), c.countries.join(' '), c.tasks.join(' ')].join(' ').toLowerCase();
  return `<li class="dc" id="${esc(c.slug)}" data-status="${esc(c.status.key)}" data-sector="${esc(c.sectors.join('|'))}" data-country="${esc([...c.countries, ...(c.country_multiple ? ['Multiple countries (not named)'] : []), ...(c.country_unknown && !c.country_multiple ? ['Not disclosed or not confirmed'] : [])].join('|'))}" data-review="${esc(c.review.key ?? '')}" data-text="${esc(text)}">
<h${level} class="dc-h"><a href="${casePath(c)}">${esc(c.organisations.map((o) => o.name).filter(Boolean).join(' and ') || 'Organisation not recorded')} · ${esc(robotText(c))}</a></h${level}>
<p class="dc-s">${statusBadge(c)} <span class="dim">${c.status.dated ? `as of ${esc(dayText(c.status.as_of))}` : 'source date unknown'}</span> · <span class="rv rv-${esc(c.review.key ?? 'none')}">${esc(c.review.label)}</span></p>${tieNote(c) ? `<p class="dim dc-tie">${esc(tieNote(c))}</p>` : ''}
<dl class="dc-kv">
<div><dt>Organisation</dt><dd>${c.organisations.map((o) => orgHtml(o, links)).join('<br>')}</dd></div>
<div><dt>Robot as recorded</dt><dd>${robotHtml(c, links)}</dd></div>
<div><dt>Sector</dt><dd>${esc(c.sectors.map(sectorLabel).join(', ') || 'Not recorded')}</dd></div>
<div><dt>Country</dt><dd>${esc(countryText(c))}${c.country_notes.length ? ` <span class="dim">(as recorded: ${esc(c.country_notes.join('; '))})</span>` : ''}</dd></div>
<div><dt>Task</dt><dd>${esc(c.tasks.join('; '))}</dd></div>
<div><dt>Evidence dates</dt><dd>${esc(c.first_date === c.last_date ? dayText(c.last_date) : `${dayText(c.first_date)} to ${dayText(c.last_date)}`)} · ${c.records} record${c.records === 1 ? '' : 's'}</dd></div>
</dl>
<details class="dc-more"><summary>${c.sources.length} source${c.sources.length === 1 ? '' : 's'}</summary>${sourcesHtml(c)}</details>
</li>`;
}

function tally(cases, key) {
  const m = new Map();
  for (const c of cases) for (const v of [].concat(key(c))) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}
const bars = (rows, label, fmt = (x) => x, n) => {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return `<div class="dv"><h3>${esc(label)}</h3><ol class="dv-l">${rows.slice(0, n ?? rows.length).map(([k, v]) => `<li><span class="dv-k">${esc(fmt(k))}</span><span class="dv-b" aria-hidden="true"><i style="width:${Math.round((v / max) * 100)}%"></i></span><b>${v}</b></li>`).join('')}</ol>${n && rows.length > n ? `<p class="dim">${rows.length - n} more in the filters below.</p>` : ''}</div>`;
};

export function renderDeploymentsCategory({ cases, records, organisations, links, offer, head, snapshot }) {
  // Current status (server/src/public/status.js): the latest dated source; cases with only undated sources apart.
  const datedCases = cases.filter((c) => c.status.dated);
  const undatedCases = cases.filter((c) => !c.status.dated);
  const byStatus = STATUS_KEYS.map((k) => [k, cases.filter((c) => c.status.key === k).length]);
  const byCurrent = STATUS_KEYS.map((k) => [k, datedCases.filter((c) => c.status.key === k).length]);
  const sectors = tally(cases, (c) => c.sectors);
  const countries = tally(cases, (c) => [...c.countries, ...(c.country_multiple ? ['Multiple countries (not named)'] : []), ...(c.country_unknown && !c.country_multiple ? ['Not disclosed or not confirmed'] : [])]);
  const reviews = tally(cases, (c) => c.review.key ?? 'none');
  const opt = (v, l, n) => `<option value="${esc(v)}">${esc(l)} (${n})</option>`;
  const REVIEW = Object.fromEntries(cases.map((c) => [c.review.key ?? 'none', c.review.label]));
  return `${head}
<p class="lede-2">We bring together <b>${records} public reports</b> covering <b>${cases.length} deployment cases</b> at ${organisations ?? 'many'} organisations. Several reports may follow the same case, from an announcement to a trial or operational use. Each case shows its current status: the one stated by its most recent dated report.</p>
<p class="caveat">These cases offer a view of adoption; they do not cover the whole market. Reports are claims as their sources state them, not facts we have verified. Robot numbers are rarely disclosed, so we do not estimate a total fleet. Open a case for its public summary and sources, or <a href="/subscribe/">subscribe</a> to explore the full task, site, timeline and reported results. Definitions: <a href="/method/#deployments">method</a>.</p>
<nav class="views dc-jump" aria-label="On this page"><a href="#cases">Browse all ${cases.length} cases</a><a href="#adoption">Adoption at a glance</a><a href="#offer">Subscription and reports</a></nav>
${offer}
<section class="dv-sec" id="adoption" aria-labelledby="adoption-h"><h2 id="adoption-h">Adoption at a glance</h2><p class="dim">Today's status of the ${datedCases.length} cases with a dated report, by their most recent one. ${undatedCases.length} more ${undatedCases.length === 1 ? 'case has' : 'cases have'} only undated reports and ${undatedCases.length === 1 ? 'is' : 'are'} counted apart. Sector and country count all ${cases.length} cases; a case can name several.</p>
<div class="dv-grid">
${bars(byCurrent, `Current status (${datedCases.length} dated cases)`, (k) => STATUS_LABELS[k])}
${bars(sectors, 'Sector', sectorLabel, 10)}
${bars(countries, 'Deployment country', (x) => x, 10)}
</div>
<p class="key">Source date unknown: ${undatedCases.length} ${undatedCases.length === 1 ? 'case' : 'cases'}${undatedCases.length ? ` (${STATUS_KEYS.map((k) => [k, undatedCases.filter((c) => c.status.key === k).length]).filter(([, v]) => v).map(([k, v]) => `${v} ${STATUS_LABELS[k].toLowerCase()} as recorded`).join(', ')})` : ''}, shown in the list with their recorded status. The evolution chart above counts something else: the most advanced status documented by each date, so its totals differ.</p>
<p class="key">Status as recorded: In operation · Pilot or trial (pilots, tests and demonstrations) · Announced (planned or agreed, not evidence of work) · Unconfirmed (operation claimed by a vendor, or unresolved). Counting cases is not independent verification, and a status is not a measure of results.</p></section>
<section class="dc-sec" id="cases" aria-labelledby="cases-h"><h2 id="cases-h">All ${cases.length} cases</h2>
<form class="dc-filters" id="dc-filters" hidden role="search" aria-label="Filter the cases">
<label class="dcf dcf-q"><span>Company or robot</span><input type="search" name="q" autocomplete="off" placeholder="e.g. Agility, BMW, Digit"></label>
<label class="dcf"><span>Status</span><select name="status"><option value="">Any status</option>${byStatus.filter(([, n]) => n).map(([k, n]) => opt(k, STATUS_LABELS[k], n)).join('')}</select></label>
<label class="dcf"><span>Sector</span><select name="sector"><option value="">Any sector</option>${sectors.map(([k, n]) => opt(k, sectorLabel(k), n)).join('')}</select></label>
<label class="dcf"><span>Country</span><select name="country"><option value="">Any country</option>${[...countries].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => opt(k, k, n)).join('')}</select></label>
<label class="dcf"><span>Reported by</span><select name="review"><option value="">Anyone</option>${reviews.map(([k, n]) => opt(k, REVIEW[k], n)).join('')}</select></label>
<button type="reset" class="dcf-clear">Clear</button>
<p class="dcf-count" id="dc-count" role="status" aria-live="polite"></p>
</form>
<ol class="dcs" id="dcs">${cases.map((c) => caseCard(c, links)).join('')}</ol>
<p class="empty" id="dcs-empty" hidden>No case matches every filter. Clear a filter to see more.</p>
</section>
<section id="paid"><h2>What the subscription adds to each case</h2><p>${esc(cap(PAID_CASE.join('; ')))}. Detailed evidence search and comparisons come with it too, where the research supports them. Missing information stays missing: the subscription does not fill gaps with estimates.</p></section>
<p class="meta">Public summaries, data as of ${esc(String(snapshot).slice(0, 10))}. Cases group the research team's claim-level records by its own deployment id: several sources about one deployment are one case.</p>`;
}

export function renderCasePage(c, links) {
  return `<p class="kicker">Deployment case · ${esc(c.records)} record${c.records === 1 ? '' : 's'}</p>
<h1>${esc(c.organisations.map((o) => o.name).filter(Boolean).join(' and ') || 'Organisation not recorded')} <em>· ${esc(robotText(c))}</em></h1>
<p class="lede">${statusBadge(c)} ${c.status.dated ? `as of ${esc(dayText(c.status.as_of))}` : '(source date unknown)'}. ${esc(c.review.label)}.</p>${tieNote(c) ? `<p class="caveat">${esc(tieNote(c))}</p>` : ''}
<p class="caveat">${esc(CASE_CAVEAT)}</p>
<section><h2>Public summary</h2>
<dl class="kv">
<dt>Organisation</dt><dd>${c.organisations.map((o) => orgHtml(o, links)).join('<br>')}</dd>
<dt>Robot as recorded</dt><dd>${robotHtml(c, links)}${c.robots.some((r) => !r.version) ? '<br><span class="dim">Version not disclosed in the sources where it is missing.</span>' : ''}</dd>
<dt>Sector</dt><dd>${esc(c.sectors.map(sectorLabel).join(', ') || 'Not recorded')}</dd>
<dt>Country</dt><dd>${esc(countryText(c))}${c.country_notes.length ? ` <span class="dim">(as recorded: ${esc(c.country_notes.join('; '))})</span>` : ''}</dd>
<dt>Task</dt><dd>${esc(c.tasks.join('; '))}</dd>
<dt>Latest status</dt><dd>${esc(c.status.detail)} (${esc(c.status.label)}), as of ${esc(dayText(c.status.as_of))}</dd>
<dt>Reported by</dt><dd>${esc(c.review.label)}</dd>
<dt>Evidence dates</dt><dd>${esc(c.first_date === c.last_date ? dayText(c.last_date) : `${dayText(c.first_date)} to ${dayText(c.last_date)}`)}</dd>
</dl></section>
<section><h2>Sources</h2>${sourcesHtml(c)}<p class="key">Each source is a public document as recorded by the research team. Its claims are summarised above as a status, not quoted.</p></section>
<section class="dc-paid"><h2>With the data subscription</h2><p>For this case: ${esc(PAID_CASE.join('; '))}. Missing information stays missing.</p></section>`;
}

// Cases that name a robot or a company, for their own pages.
export function casesHtml(list, links, { heading = 'Deployment cases' } = {}) {
  if (!list.length) return '';
  return `<section><h2>${esc(heading)} <span class="dim">(${list.length})</span></h2><ol class="dcs dcs-compact">${list.map((c) => caseCard(c, links, { level: 3 })).join('')}</ol><p class="key">${esc(CASE_CAVEAT)} <a href="/deployments/">All cases</a>.</p></section>`;
}
