// One page frame for every route (Javier, 26 Nov 2026): the generated pages, the home page and the subscriber app use
// the same maximum width and gutter, from one source per surface, and no stylesheet narrows or widens <main> again.
//   node --no-warnings --test tools/test-frame.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('pages.css holds the frame: 1380 px wide, 16 to 40 px gutter, used by main and the header', () => {
  const css = read('assets/pages.css');
  assert.match(css, /:root\{--page-max:1380px;--page-gutter:clamp\(16px,4vw,40px\)\}/);
  assert.match(css, /main\{max-width:var\(--page-max\);margin:0 auto;padding:24px var\(--page-gutter\) 48px\}/);
  assert.match(css, /\.top\{[^}]*padding:12px var\(--page-gutter\)/);
});

test('no other stylesheet sets the width of main', () => {
  for (const f of readdirSync(new URL('assets/', root)).filter((x) => x.endsWith('.css') && x !== 'pages.css')) {
    assert.doesNotMatch(read(`assets/${f}`), /(^|[},\s])main(\.[\w-]+)?\s*\{[^}]*max-width/, `${f} sets main's width`);
  }
  assert.doesNotMatch(read('assets/reports.css'), /\.rp-page\{max-width:\d/, 'report pages are not narrowed');
});

test('the home page and the subscriber app use the same frame', () => {
  const home = read('index.html');
  assert.match(home, /--gut:clamp\(16px, 4vw, 40px\);/);
  assert.match(home, /\.wrap\{max-width:1300px;margin:0 auto\}/, 'home content: 1380 px frame less two 40 px gutters');
  for (const f of ['server/public/index.html', 'app/index.html']) {
    const app = read(f);
    assert.match(app, /--gut:clamp\(16px, 4vw, 40px\);/, f);
    assert.match(app, /main\{padding:24px var\(--gut\) 64px;max-width:1380px;margin:0 auto\}/, f);
  }
});

// One type scale (Javier, 26 Nov 2026), measured from Integrators role by role and defined once per surface.
test('pages.css holds the type scale and the base roles use it', () => {
  const css = read('assets/pages.css');
  assert.match(css, /--fs-display:clamp\(40px,5\.6vw,72px\);--fs-intro:clamp\(17px,1\.6vw,21px\);--fs-feature:clamp\(24px,3\.2vw,34px\);--fs-panel:clamp\(26px,2\.4vw,32px\);--fs-card:24px;--fs-card-sub:22px;--fs-section:13px;--fs-label:12px;--fs-caption:11px;--fs-control:15px;/);
  assert.match(css, /h1\{font-family:var\(--f-serif\);font-weight:400;font-size:var\(--fs-display\)/);
  assert.match(css, /\.lede\{font-size:var\(--fs-intro\)/);
  assert.match(css, /h2\{font-family:var\(--f-mono\);font-size:var\(--fs-section\)/);
  assert.match(css, /table\{border-collapse:collapse;width:100%;font-size:var\(--fs-table\)\}/);
  assert.match(css, /--fs-th:10\.5px;--fs-card-body:14\.5px/);
  assert.match(css, /th\{font-family:var\(--f-mono\);font-size:var\(--fs-th\);font-weight:400;color:var\(--bone-3\);letter-spacing:\.04em;text-transform:uppercase;/, 'column headers take the Integrators comparison-table role');
});

test('no page stylesheet sets its own display or intro size again', () => {
  for (const f of readdirSync(new URL('assets/', root)).filter((x) => x.endsWith('.css') && x !== 'pages.css')) {
    const css = read(`assets/${f}`);
    assert.doesNotMatch(css, /(^|[},\s])(\.[\w-]+\s+)*h1\s*\{[^}]*font-size/, `${f} sizes h1`);
    assert.doesNotMatch(css, /\.lede\{[^}]*font-size/, `${f} sizes the intro`);
  }
});

test('the home page and the app use the same display, intro, feature and label sizes', () => {
  const home = read('index.html');
  assert.match(home, /--fs-display:clamp\(40px,5\.6vw,72px\); --fs-intro:clamp\(17px,1\.6vw,21px\); --fs-feature:clamp\(24px,3\.2vw,34px\);/);
  assert.match(home, /--fs-label:12px;/);
  assert.match(home, /\.display\{font-family:var\(--f-serif\);font-size:var\(--fs-display\);line-height:1\.05;font-weight:400;letter-spacing:-\.01em/);
  for (const f of ['server/public/index.html', 'app/index.html']) {
    const app = read(f);
    assert.match(app, /family=Instrument\+Serif/, `${f} loads the display face`);
    assert.match(app, /--fs-panel:clamp\(26px,2\.4vw,32px\);/, f);
    assert.match(app, /--fs-label:12px; --fs-th:10\.5px;/, f);
  }
  // Brand and navigation as in the generated header: the body size (16, 15.5 at 640 px and below), weight 600, labels tracked .06em.
  for (const f of ['index.html', 'server/public/index.html', 'app/index.html']) {
    const s = read(f);
    assert.match(s, /\.brand\{[^}]*font-weight:600;letter-spacing:\.01em;/, `${f} brand`);
    assert.doesNotMatch(s, /\.brand\{[^}]*font-size/, `${f} sizes the brand instead of inheriting the body size`);
  }
  assert.match(home, /--track-label:\.06em;/);
});
