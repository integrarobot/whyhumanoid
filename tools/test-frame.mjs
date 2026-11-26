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
