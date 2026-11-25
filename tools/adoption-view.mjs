// Adoption view of the home page (Javier, 23 Nov 2026): replaces the Height × mass chart of the hero. Built only from
// the public projection (data/public/projection.json, `cases`): one mark per deployment case, placed at its most
// advanced status as recorded (the method's order), with organisation, robot as recorded, sector, countries, years and
// the number of records. No site, task, metric, claim, verification, source or record id: those stay for subscribers.
// Static HTML that reads without JavaScript (each case links to its company page); the page script adds filters and
// a detail panel. Counting: cases (deduplicated deployments), records (claims) and organisations are named apart;
// robot fleets are not summed because few records state a comparable count.

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const human = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Stages, top to bottom: the method's order of status as recorded (most advanced first).
// Cases whose sources are all undated have no current status by date (server/src/public/status.js): they form their
// own group, after the four statuses, and keep their recorded status in their summary.
export const UNDATED = { key: 'nodate', label: 'Source date unknown', note: 'every source of the case is undated, so it has no current status by date' };
export const STAGES = [
  { key: 'op', label: 'In operation', note: 'the source says the robot is working in operation' },
  { key: 'pilot', label: 'Pilot or trial', note: 'a pilot, trial or test' },
  { key: 'unc', label: 'Unconfirmed', note: 'operation claimed by a vendor, or unresolved' },
  { key: 'ann', label: 'Announced', note: 'planned or agreed, not evidence of work' },
];
// Sector families: a presentation grouping of the sector labels as recorded, for the filter only.
export const FAMILIES = [
  ['automotive', 'Automotive', /^automotive/],
  ['electronics', 'Electronics, chips and batteries', /electronics|semiconductor|battery/],
  ['logistics', 'Logistics and retail', /logistics|retail/],
  ['industry', 'Other manufacturing', /manufacturing|shipbuilding|railway|electricity/],
  ['other', 'Other or not disclosed', /./],
];
export const familyOf = (sector) => FAMILIES.find(([, , re]) => re.test(String(sector ?? 'other')))[0];

// The robot as recorded is "<maker> <model>" from the sheet. Drop a repeated maker ("Galbot Galbot S1" -> "Galbot S1");
// otherwise keep the recorded text as it is, whatever its capitalisation.
export function robotLabel(maker, recorded) {
  const text = String(recorded ?? '').trim();
  const m = String(maker ?? '').trim();
  if (!text) return m || null;
  if (!m || !text.toLowerCase().startsWith(m.toLowerCase())) return text;
  const rest = text.slice(m.length).trim();
  if (!rest) return m;
  return rest.toLowerCase().startsWith(m.toLowerCase()) ? rest : text;
}

export function adoptionModel(projection, links) {
  const slugOf = new Map(projection.companies.map((c) => [c.id, c.slug]));
  const cases = projection.cases.map((c, i) => {
    const maker = String(c.maker?.name ?? '');
    const robot = robotLabel(maker, c.robot_recorded);
    return {
      i, stage: c.dated === false ? UNDATED.key : c.stage, recorded: c.stage, status: c.status, records: c.records, org: c.organisation?.name ?? 'Organisation not recorded',
      orgPath: c.organisation?.company && slugOf.has(c.organisation.company) ? `/companies/${slugOf.get(c.organisation.company)}/` : null,
      maker, makerPath: c.maker?.company && slugOf.has(c.maker.company) ? `/companies/${slugOf.get(c.maker.company)}/` : null,
      robot, robotPath: c.robot !== null && c.robot !== undefined ? links.robots?.[c.robot] ?? null : null, family: c.level === 'family',
      sector: c.sector ? human(c.sector) : 'Sector not recorded', fam: familyOf(c.sector), countries: c.countries ?? [], years: c.years,
    };
  });
  const orgs = (xs) => new Set(xs.map((c) => c.orgPath ?? c.org)).size;
  return { cases, orgs, totals: projection.totals, snapshot: String(projection.snapshot ?? '').slice(0, 10) };
}

const yearsText = (y) => (!y ? 'year not recorded' : y[0] === y[1] ? String(y[0]) : `${y[0]} to ${y[1]}`);
export function caseSummary(c) {
  return `${c.org} · ${c.robot || 'robot not recorded'} · ${c.sector} · ${c.countries.join(', ') || 'country not recorded'} · ${yearsText(c.years)} · ${c.records} record${c.records === 1 ? '' : 's'}${c.stage === UNDATED.key ? ` · status as recorded, sources undated: ${STAGES.find((s) => s.key === c.recorded)?.label ?? 'not recorded'}` : ''}`;
}

export function renderAdoption(projection, links) {
  const m = adoptionModel(projection, links);
  const n = m.cases.length;
  const GROUPS = [...STAGES, UNDATED];
  const by = Object.fromEntries(GROUPS.map((s) => [s.key, m.cases.filter((c) => c.stage === s.key)]));
  const dated = n - by.nodate.length;
  const famCount = (k) => m.cases.filter((c) => c.fam === k).length;
  const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const chip = (c) => `<li><a class="case s-${c.stage}" href="${esc(c.orgPath ?? '/deployments/')}" data-case="${c.i}" data-fam="${c.fam}" title="${esc(caseSummary(c))}" aria-label="${esc(caseSummary(c))}"><span class="o">${esc(c.org)}</span><span class="r">${esc(c.maker || 'Robot not recorded')}</span></a></li>`;
  const max = Math.max(...STAGES.map((s) => by[s.key].length));
  // Hero: the answer at a glance, with the cases in operation named.
  const bars = STAGES.map((s) => `<li class="s-${s.key}"><span class="bl">${esc(s.label)}</span><span class="bt"><span class="bf" style="width:${Math.round((by[s.key].length / max) * 100)}%"></span></span><span class="bn"><b>${by[s.key].length}</b> ${by[s.key].length === 1 ? 'case' : 'cases'} · ${plural(m.orgs(by[s.key]), 'org')}</span></li>`).join('');
  const hero = `<!-- adoption:start -->
      <figure class="adopt adopt-hero" aria-labelledby="adopt-h">
        <figcaption class="fc-head"><span class="lbl hi" id="adopt-h">Where humanoid robots are working</span><span class="lbl">Snapshot ${esc(m.snapshot)}</span></figcaption>
        <p class="adopt-lede"><b>${by.op.length}</b> of <b>${n}</b> recorded deployment cases are recorded as in operation. Most are pilots, unconfirmed claims or announcements.</p>
        <ol class="stage-bars" aria-label="Deployment cases by most advanced status as recorded">${bars}</ol>
        <div class="adopt-op"><span class="lbl">In operation, as recorded</span><ul class="cases">${by.op.map(chip).join('')}</ul></div>
        <p class="adopt-go"><a class="btn" href="#adoption">Explore all ${n} cases</a></p>
        <p class="fc-note">A case is one deployment of one organisation (${m.totals.records} records describe ${n} cases at ${m.totals.organisations} organisations), at its most advanced status as recorded. Claims as recorded, not verified facts; not a census of the market.</p>
      </figure>
      <!-- adoption:end -->`;
  const rungs = GROUPS.filter((s) => s.key !== UNDATED.key || by[s.key].length).map((s) => {
    const xs = [...by[s.key]].sort((a, b) => a.fam.localeCompare(b.fam) || a.org.localeCompare(b.org));
    return `<details class="rung r-${s.key}" data-stage="${s.key}" open><summary class="rung-h"><span class="sw s-${s.key}" aria-hidden="true"></span><b>${esc(s.label)}</b><span class="rung-n"><span class="nc">${xs.length}</span> of ${n} cases · <span class="no">${plural(m.orgs(xs), 'organisation')}</span></span><span class="rung-note">${esc(s.note)}</span></summary><ul class="cases">${xs.map(chip).join('')}</ul></details>`;
  }).join('');
  const share = GROUPS.map((s) => `<span class="seg s-${s.key}" style="flex:${by[s.key].length}" title="${esc(s.label)}: ${by[s.key].length} of ${n} cases"></span>`).join('');
  const table = m.cases.map((c) => `<tr><td>${esc(c.stage === UNDATED.key ? `${STAGES.find((s) => s.key === c.recorded)?.label ?? 'Not recorded'} (sources undated)` : STAGES.find((s) => s.key === c.stage).label)}</td><td>${c.orgPath ? `<a href="${c.orgPath}">${esc(c.org)}</a>` : esc(c.org)}</td><td>${esc(c.robot || 'Not recorded')}</td><td>${esc(c.sector)}</td><td>${esc(c.countries.join(', ') || 'Not recorded')}</td><td>${esc(yearsText(c.years))}</td><td>${c.records}</td></tr>`).join('');
  const data = JSON.stringify(m.cases.map(({ i, ...c }) => c)).replace(/</g, '\\u003c');
  const section = `<!-- adoption-explorer:start -->
    <section class="adopt adopt-sec" id="adoption" aria-labelledby="adoption-h">
      <div class="adopt-head"><h2 class="h2" id="adoption-h">The adoption <em>ladder</em></h2><p class="lbl">${n} deployment cases · ${m.totals.organisations} organisations · ${m.totals.records} records · snapshot ${esc(m.snapshot)}</p></div>
      <p class="adopt-intro">Every recorded deployment case of a humanoid robot, from announcement to operation. Each mark is one case: the organisation using the robot and the robot's maker. Choose a case for its details; filter by sector.</p>
      <div class="adopt-share" role="img" aria-label="${GROUPS.map((s) => `${s.label}: ${by[s.key].length}`).join(', ')} of ${n} cases">${share}</div>
      <div class="adopt-filters" role="group" aria-label="Filter cases by sector"><button type="button" class="chip" data-fam="all" aria-pressed="true">All <span>${n}</span></button>${FAMILIES.filter(([k]) => famCount(k)).map(([k, label]) => `<button type="button" class="chip" data-fam="${k}" aria-pressed="false">${esc(label)} <span>${famCount(k)}</span></button>`).join('')}</div>
      <div class="ladder">${rungs}</div>
      <div class="adopt-detail" id="adopt-detail" aria-live="polite" hidden></div>
      <details class="adopt-table"><summary>All ${n} cases as a table</summary><div class="adopt-scroll"><table><thead><tr><th scope="col">Status as recorded</th><th scope="col">Organisation</th><th scope="col">Robot as recorded</th><th scope="col">Sector</th><th scope="col">Country</th><th scope="col">Years</th><th scope="col">Records</th></tr></thead><tbody>${table}</tbody></table></div></details>
      <p class="adopt-foot">What counts: a <b>case</b> is one deployment of one organisation, placed at its <b>current status</b>: the status recorded by its most recent dated source (a year or month counts from its first day; when several sources share that date, the most advanced of them, in the order of the <a href="/method/">method</a>: in operation, then pilot or trial, then a vendor's unconfirmed claim of operation, then announced). A later source that records less, such as a planned expansion, is what the case shows now. ${dated} cases have a dated source; ${by.nodate.length} have only undated sources and are grouped apart. A <b>record</b> is one claim from one named source; ${m.totals.records} records describe these ${n} cases at ${m.totals.organisations} user organisations. Records are claims as recorded, not verified facts, collected by Why Humanoid? from public sources: this is not a census of the market. Robot counts are stated for few cases, so no fleet total is given; a missing figure is unknown, not zero. Sectors are grouped only for the filter. Sites, tasks, metrics, verification and sources of each record come with the <a href="/deployments/">Deployments</a> subscription.</p>
      <script type="application/json" id="adoption-data">${data}</script>
    </section>
    <!-- adoption-explorer:end -->`;
  return { hero, section };
}
