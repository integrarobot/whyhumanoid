// Newsletter and News (editorial/): store validation, idempotent ingestion, item identity, safe rendering and the
// publication switch. Synthetic fixtures only (tools/fixtures/editorial/); they never enter editorial/ or the site.
//   node --no-warnings --test tools/test-editorial.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { contentHash, coverage, editionProblems, itemId, readStore, readyEditions, storeProblems } from './editorial-model.mjs';
import { planIngest, storeFiles, stateOf } from './editorial.mjs';
import { editorialPages, editorialUrls, inline, renderMarkdown } from './editorial-view.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const fixture = () => JSON.parse(read('tools/fixtures/editorial/package.synthetic.json'));
const emptyStore = () => ({ config: { published: false }, inventory: { source: {}, pagination: { pages: [], exhausted: false }, complete: false, completeness: null, editions: [] }, editions: new Map(), originals: new Map() });
const ingested = (pkg = fixture()) => {
  const r = planIngest(emptyStore(), pkg);
  assert.deepEqual(r.problems, [], 'the synthetic package is valid');
  return r.next;
};
// A page frame like build-pages' own, enough to inspect what the editorial view puts in it.
const page = ({ title, path, body, noindex }) => `<title>${title}</title>${noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="canonical" href="https://whyhumanoid.com${path}"><main>${body}</main>`;
const crumbs = (items) => `<nav class="crumbs">${items.map(([h, l]) => (h ? `<a href="${h}">${l}</a>` : `<span>${l}</span>`)).join('/')}</nav>`;
const views = (store) => editorialPages(store, { page, crumbs, assetVersion: () => 'test' });

test('the committed store holds no editorial record yet, is valid, and claims no completeness', () => {
  const store = readStore(root);
  assert.deepEqual(storeProblems(store), []);
  assert.equal(store.config.published, false, 'embargo: the sections are not published');
  assert.equal(store.editions.size, 0);
  assert.equal(store.originals.size, 0);
  assert.equal(store.inventory.editions.length, 0);
  const c = coverage(store);
  assert.equal(c.complete, false);
  assert.equal(readyEditions(store).length, 0);
  assert.deepEqual(store.state, stateOf(store, null), 'state.json matches the store');
});

test('no synthetic fixture text reaches the store or the generated pages', () => {
  const files = [];
  const walk = (dir) => { for (const e of readdirSync(new URL(dir, root), { withFileTypes: true })) { const p = `${dir}${e.name}`; if (e.isDirectory()) walk(`${p}/`); else files.push(p); } };
  for (const d of ['editorial/', 'newsletter/', 'news/']) walk(d);
  for (const f of files) assert.doesNotMatch(read(f), /SYNTHETIC FIXTURE|example\.com|Synthetic fixture/i, f);
});

test('the generated pages are honest empty pages, noindex, outside the sitemap while unpublished', () => {
  const built = views(readStore(root));
  assert.deepEqual([...built.keys()].sort(), ['news/2025/index.html', 'news/2026/index.html', 'news/index.html', 'newsletter/2025/index.html', 'newsletter/2026/index.html', 'newsletter/index.html']);
  for (const html of built.values()) {
    assert.match(html, /name="robots" content="noindex"/);
    assert.match(html, /are published here yet\. They appear once their English text has been reviewed\./);
  }
  assert.deepEqual(editorialUrls(readStore(root)), []);
  const sitemap = read('sitemap.xml');
  assert.doesNotMatch(sitemap, /\/newsletter\/|\/news\//, 'no editorial URL in the sitemap');
  for (const f of ['index.html', 'about/index.html', 'method/index.html']) assert.doesNotMatch(read(f), /href="\/(newsletter|news)\/"/, `${f} does not link the sections yet`);
});

test('the existing company headlines (assets/news.js, GET /v1/news) are a separate feature, untouched', () => {
  assert.match(read('assets/news.js'), /\/v1\/news\?security=/);
  assert.doesNotMatch(read('tools/editorial-view.mjs'), /v1\/news|news\.js/);
});

test('ingestion is idempotent: the same package twice writes the same files and changes nothing', () => {
  const pkg = fixture();
  const text = JSON.stringify(pkg);
  const first = ingested(pkg);
  const again = planIngest(first, pkg);
  assert.deepEqual(again.problems, []);
  assert.deepEqual(again.changes, { added: [], changed: [], unchanged: ['nl-2025-03-12-synthetic-first', 'nl-2026-01-20-synthetic-second'], originals: [] });
  assert.deepEqual([...storeFiles(again.next, text)], [...storeFiles(first, text)]);
  assert.equal(first.originals.size, 1, 'the Spanish original is archived separately when supplied');
  assert.equal(first.editions.get('nl-2025-03-12-synthetic-first').original_sha256, contentHash(first.originals.get('nl-2025-03-12-synthetic-first')));
  assert.equal(first.editions.get('nl-2026-01-20-synthetic-second').original_sha256, null, 'an English-only edition is accepted without a Spanish original');
});

test('ingestion is incremental and never drops an edition already ingested', () => {
  const store = ingested();
  const onlyNew = { ...fixture(), inventory: [], editions: [] };
  assert.deepEqual(planIngest(store, onlyNew).problems, [], 'a package without the old editions keeps them');
  const demote = { ...fixture(), editions: [], inventory: [{ ...fixture().inventory[0], status: 'pending' }] };
  assert.ok(planIngest(store, demote).problems.some((p) => /already ingested; the inventory may not mark it pending/.test(p)));
});

test('news items are identified by edition and position, never deduplicated by headline', () => {
  const ready = readyEditions(ingested());
  assert.deepEqual(ready.map((e) => e.id), ['nl-2025-03-12-synthetic-first'], 'only the reviewed edition is ready');
  assert.deepEqual(ready[0].items.map((i) => i.id), ['nl-2025-03-12-synthetic-first/01', 'nl-2025-03-12-synthetic-first/02']);
  const both = fixture();
  both.editions[1].translation = { ...both.editions[1].translation, status: 'reviewed', reviewed_by: 'Synthetic reviewer', reviewed_on: '2026-11-23' };
  const items = readyEditions(ingested(both)).flatMap((e) => e.items);
  assert.equal(items.filter((i) => i.headline === 'Same headline in two editions').length, 2, 'the same headline in two editions stays two items');
  assert.equal(itemId('nl-2026-01-20-x', 3), 'nl-2026-01-20-x/03');
});

test('a reviewed edition, or a change of News order, needs an explicit --accept-change', () => {
  const store = ingested();
  const edited = fixture();
  edited.editions[0].title = 'Synthetic fixture edition one, corrected';
  assert.ok(planIngest(store, edited).problems.some((p) => /already reviewed; pass --accept-change nl-2025-03-12-synthetic-first/.test(p)));
  assert.deepEqual(planIngest(store, edited, { accept: ['nl-2025-03-12-synthetic-first'] }).problems, []);
  const draft = fixture();
  draft.editions[1].body_markdown += ' A draft may be corrected freely.';
  assert.deepEqual(planIngest(store, draft).problems, []);
  const reordered = fixture();
  reordered.editions[1].more_news.items.push({ position: 2, headline: 'An extra item', body_markdown: '' });
  assert.ok(planIngest(store, reordered).problems.some((p) => /another News item order/.test(p)));
});

test('validation: identity, dates, scope, the More news split, safe Markdown, translation state', () => {
  const base = fixture();
  const bad = (mutate, pattern) => {
    const pkg = fixture();
    mutate(pkg);
    const { problems } = planIngest(emptyStore(), pkg);
    assert.ok(problems.some((p) => pattern.test(p)), `${pattern} in ${JSON.stringify(problems)}`);
  };
  bad((p) => { p.editions[1].edition_id = p.editions[0].edition_id; p.inventory[1].edition_id = p.inventory[0].edition_id; }, /listed twice/);
  bad((p) => { p.inventory[1].source_url = p.inventory[0].source_url; }, /source_url .*listed twice/);
  bad((p) => { p.editions[0].published_on = '2025-03-13'; }, /date in edition_id differs/);
  bad((p) => { p.editions[0].edition_id = 'nl-2024-03-12-old'; p.editions[0].published_on = '2024-03-12'; p.inventory[0].edition_id = 'nl-2024-03-12-old'; p.inventory[0].published_on = '2024-03-12'; }, /outside 2025 and 2026|a date in 2025 or 2026/);
  bad((p) => { p.editions[0].body_markdown += '\n\n## More news\n\n- item'; }, /still contains the More news block/);
  bad((p) => { p.editions[0].body_markdown += '\n\n<script>alert(1)</script>'; }, /raw HTML/);
  bad((p) => { p.editions[0].body_markdown += ' [x](javascript:alert(1))'; }, /not an http\(s\) URL/);
  bad((p) => { p.editions[1].body_markdown = 'Este es el texto de la edición que no está traducido para los lectores con más noticias de robótica.'; }, /looks untranslated/);
  bad((p) => { p.editions[0].translation.reviewed_by = null; }, /names reviewed_by and reviewed_on/);
  bad((p) => { p.editions[0].translation.translated_on = '2025-03-01'; }, /translated before the original was published/);
  bad((p) => { p.inventory[2].note = null; }, /inaccessible edition needs a note/);
  bad((p) => { p.editions[1].more_news.status = 'absent'; }, /is absent but lists items/);
  bad((p) => { p.editions[1].more_news = { status: 'inaccessible', note: null, items: [] }; }, /inaccessible More news block needs a note/);
  bad((p) => { p.editions[0].more_news.items[1].position = 3; }, /positions must run 1, 2, 3/);
  bad((p) => { p.editions[0].body_markdown = p.editions[0].body_markdown.replace('https://example.com/one', 'https://example.com/other'); }, /does not keep exactly the links of the original/);
  bad((p) => { p.editions[0].more_news.items.pop(); }, /2 in the original|More news items for/);
  bad((p) => { p.editions[0].original_sha256 = 'f'.repeat(64); }, /does not match the original it carries/);
  bad((p) => { p.complete = true; }, /complete needs pagination\.exhausted/);
  bad((p) => { p.editions[0].extra = 1; }, /unknown fields extra/);
  assert.ok(base.editions.length === 2);
});

test('a stale original (changed after translation) keeps the edition out of publication', () => {
  const store = ingested();
  const o = store.originals.get('nl-2025-03-12-synthetic-first');
  store.originals.set(o.edition_id, { ...o, title: 'Edición cambiada' });
  assert.ok(editionProblems(store.editions.get(o.edition_id), { original: store.originals.get(o.edition_id) }).some((p) => /stale/.test(p)));
  assert.equal(readyEditions(store).length, 0);
});

test('the renderer escapes everything and only builds safe links', () => {
  assert.equal(inline('<b>x</b> & "y"'), '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
  assert.equal(inline('[t](javascript:alert(1))'), '[t](javascript:alert(1))');
  assert.match(inline('[a **b**](https://example.com/?q=1&r=2)'), /^<a href="https:\/\/example\.com\/\?q=1&amp;r=2" rel="noopener noreferrer">a <strong>b<\/strong><\/a>$/);
  assert.match(inline('see https://example.com/x.'), /<a href="https:\/\/example\.com\/x" rel="noopener noreferrer">https:\/\/example\.com\/x<\/a>\.$/);
  assert.equal(inline('![alt](https://example.com/i.png)'), '<a href="https://example.com/i.png" rel="noopener noreferrer">Image: alt</a>');
  const html = renderMarkdown('# Top\n\ntext\n\n### Sub\n\n- a\n- b\n\n1. one\n2. two\n\n> quoted');
  assert.equal(html, '<h2>Top</h2>\n<p>text</p>\n<h3>Sub</h3>\n<ul><li>a</li><li>b</li></ul>\n<ol><li>one</li><li>two</li></ol>\n<blockquote><p>quoted</p></blockquote>');
  assert.doesNotMatch(renderMarkdown('<img src=x onerror=alert(1)>'), /<img/);
});

test('pages: original and translation dates apart, source links, items in order with their parent, search markup', () => {
  const store = ingested();
  const built = views(store);
  const edition = built.get('newsletter/nl-2025-03-12-synthetic-first/index.html');
  assert.match(edition, /First published in Spanish on <time datetime="2025-03-12">12 March 2025<\/time> · English translation dated <time datetime="2026-11-20">20 November 2026<\/time>/);
  assert.match(edition, /<a href="https:\/\/newsletter\.example\.com\/p\/synthetic-first" rel="noopener noreferrer">Original edition<\/a>/);
  assert.match(edition, /<ol class="ed-items"><li value="1"><a href="\/news\/nl-2025-03-12-synthetic-first\/01\/">Same headline in two editions<\/a><\/li><li value="2">/);
  assert.doesNotMatch(edition, /Edición sintética|FIXTURE SINTÉTICO/, 'the Spanish original is never rendered');
  const item = built.get('news/nl-2025-03-12-synthetic-first/02/index.html');
  assert.match(item, /News · item 2 of 2/);
  assert.match(item, /From the newsletter <a href="\/newsletter\/nl-2025-03-12-synthetic-first\/">Synthetic fixture edition one<\/a>/);
  assert.match(item, /rel="prev">Previous item<\/a><span><\/span>/);
  assert.equal(built.has('newsletter/nl-2026-01-20-synthetic-second/index.html'), false, 'a draft translation is not published');
  const list = built.get('newsletter/index.html');
  assert.match(list, /<form class="ed-search" role="search" hidden/);
  assert.match(list, /<h3 id="m-2025-03">March 2025<\/h3>/);
  assert.match(list, /data-ed-text="synthetic fixture edition one/);
  assert.match(built.get('newsletter/2026/index.html'), /No newsletter editions are published here yet/);
  assert.match(built.get('news/2025/index.html'), /<ol class="ed-items"><li value="1" data-ed-text=/);
  for (const html of built.values()) assert.match(html, /noindex/);
  assert.deepEqual(editorialUrls(store), []);
  const published = { ...store, config: { published: true } };
  assert.ok(editorialUrls(published).includes('/news/nl-2025-03-12-synthetic-first/01/'));
  for (const html of views(published).values()) assert.doesNotMatch(html, /noindex/);
});

test('coverage counts by year, exceptions included, and never declares completeness by itself', () => {
  const c = coverage(ingested());
  assert.deepEqual([c.years[2025].ingested, c.years[2026].ingested, c.years[2026].inaccessible], [1, 1, 1]);
  assert.deepEqual(c.years[2025].translations, { reviewed: 1, draft: 0 });
  assert.equal(c.years[2025].ready_news_items, 2);
  assert.equal(c.complete, false);
});
