// Headless check of the Blog and News search (26 Nov 2026). Run from tools/: node verify-editorial.mjs
// Builds the list pages from the synthetic fixture package (in memory, never written) with the real stylesheets and
// assets/editorial.js in JSDOM. Without JavaScript the search form stays hidden and every entry is listed; with it
// the form appears, filters entries and hides empty month groups.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { planIngest } from './editorial.mjs';
import { editorialPages } from './editorial-view.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const failures = [];
const ok = (c, m) => { if (!c) failures.push(m); };

const pkg = JSON.parse(read('tools/fixtures/editorial/package.synthetic.json'));
pkg.editions[1].translation = { ...pkg.editions[1].translation, status: 'reviewed', reviewed_by: 'Synthetic reviewer', reviewed_on: '2026-11-23', review_evidence: 'SYNTHETIC FIXTURE' };
const empty = { config: { published: false, embargo_until: '2026-11-27', scope: { years: [2025, 2026] } }, inventory: { source: {}, pagination: { pages: [], exhausted: false }, complete: false, completeness: null, editions: [] }, editions: new Map(), originals: new Map() };
const { problems, next } = planIngest(empty, pkg);
if (problems.length) throw new Error(problems.join('\n'));
const css = `${read('assets/pages.css')}\n${read('assets/editorial.css')}`;
const page = ({ body }) => `<!doctype html><html><head><style>${css}</style></head><body><main>${body}</main></body></html>`;
const pages = editorialPages(next, { page, crumbs: () => '', assetVersion: () => 'x', today: '2026-11-26' });
const script = read('assets/editorial.js');

for (const [file, entries] of [['blog/index.html', 2], ['news/index.html', 3]]) {
  const html = pages.get(file);
  const off = new JSDOM(html).window;
  const form = off.document.querySelector('.ed-search');
  ok(form && form.hidden, `${file}: the form is emitted hidden`);
  ok(off.getComputedStyle(form).display === 'none', `${file}: without JavaScript the hidden form is not displayed (got ${off.getComputedStyle(form).display})`);
  ok(off.document.querySelectorAll('[data-ed-text]').length === entries, `${file}: every entry listed without JavaScript`);

  const on = new JSDOM(html, { runScripts: 'outside-only', url: 'https://whyhumanoid.com/' }).window;
  on.eval(script);
  const f = on.document.querySelector('.ed-search');
  ok(!f.hidden && on.getComputedStyle(f).display === 'grid', `${file}: with JavaScript the form is shown`);
  const input = f.querySelector('input');
  input.value = 'second';
  input.dispatchEvent(new on.Event('input'));
  const visible = [...on.document.querySelectorAll('[data-ed-text]')].filter((el) => on.getComputedStyle(el).display !== 'none');
  const expected = 1;
  ok(visible.length === expected, `${file}: "second" leaves ${expected} entries, found ${visible.length}`);
  ok(f.querySelector('.ed-count').textContent === `${expected} ${expected === 1 ? 'match' : 'matches'}`, `${file}: the count says ${expected}`);
  const hiddenGroups = [...on.document.querySelectorAll('[data-ed-group]')].filter((g) => g.hasAttribute('data-ed-hidden')).length;
  ok(hiddenGroups > 0, `${file}: months without a match are hidden`);
  input.value = '';
  input.dispatchEvent(new on.Event('input'));
  ok([...on.document.querySelectorAll('[data-ed-text]')].every((el) => !el.hasAttribute('data-ed-hidden')), `${file}: clearing the search shows everything again`);
}

if (failures.length) { console.error(`Editorial search check FAILED:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log('Editorial search check passed: hidden and listed without JavaScript; shown, filtering and counting with it, on the Blog and News lists of the synthetic fixture.');
