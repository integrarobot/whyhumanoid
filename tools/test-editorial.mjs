// Newsletter and News (editorial/): store validation, idempotent ingestion, item identity, safe rendering and the
// publication switch. Synthetic fixtures only (tools/fixtures/editorial/); they never enter editorial/ or the site.
//   node --no-warnings --test tools/test-editorial.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DEFAULT_YEARS, contentHash, coverage, editionProblems, findLinks, inventoryProblems, isLive, itemId, madridToday, markdownProblems, readStore, readyEditions, storeProblems, urlsIn } from './editorial-model.mjs';
import { planIngest, storeFiles, stateOf } from './editorial.mjs';
import { editorialPages, editorialUrls, inline, renderMarkdown } from './editorial-view.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const fixture = () => JSON.parse(read('tools/fixtures/editorial/package.synthetic.json'));
const emptyStore = () => ({ config: { published: false, embargo_until: '2026-11-27', scope: { years: [2025, 2026] } }, inventory: { source: {}, pagination: { pages: [], exhausted: false }, complete: false, completeness: null, editions: [] }, editions: new Map(), originals: new Map() });
const ingested = (pkg = fixture()) => {
  const r = planIngest(emptyStore(), pkg);
  assert.deepEqual(r.problems, [], 'the synthetic package is valid');
  return r.next;
};
// A page frame like build-pages' own, enough to inspect what the editorial view puts in it.
const page = ({ title, path, body, noindex }) => `<title>${title}</title>${noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="canonical" href="https://whyhumanoid.com${path}"><main>${body}</main>`;
const crumbs = (items) => `<nav class="crumbs">${items.map(([h, l]) => (h ? `<a href="${h}">${l}</a>` : `<span>${l}</span>`)).join('/')}</nav>`;
const redirect = (to, label) => `<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><a href="${to}">${label}</a>`;
const views = (store, today = '2026-11-26', withRedirects = false) => editorialPages(store, { page, crumbs, assetVersion: () => 'test', today, ...(withRedirects ? { redirect } : {}) });

test('the committed store holds no editorial record yet, is valid, published from the embargo date, and claims no completeness', () => {
  const store = readStore(root);
  assert.deepEqual(storeProblems(store, { today: '2026-11-27' }), []);
  assert.equal(store.config.published, true, 'publication authorised by Javier on 2026-11-27');
  assert.equal(store.config.embargo_until, '2026-11-27');
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
  for (const d of ['editorial/', 'blog/', 'newsletter/', 'news/']) walk(d);
  for (const f of files) assert.doesNotMatch(read(f), /SYNTHETIC FIXTURE|example\.com|Synthetic fixture/i, f);
});

test('live sections: Blog and News pages are indexable, in the sitemap and linked from the home page and every footer', () => {
  const store = readStore(root);
  const built = views(store, '2026-11-27', true);
  const pages = [...built.keys()].filter((f) => !f.startsWith('newsletter/')).sort();
  assert.deepEqual(pages, ['blog/2025/index.html', 'blog/2026/index.html', 'blog/index.html', 'news/2025/index.html', 'news/2026/index.html', 'news/index.html']);
  for (const f of pages) {
    assert.doesNotMatch(built.get(f), /noindex/, `${f} is indexable once live`);
    assert.match(built.get(f), /are published here yet\. They appear once their English text has been reviewed\./, `${f}: honest while no edition is ready`);
  }
  assert.match(built.get('blog/index.html'), /<h1>Blog<\/h1>/);
  assert.deepEqual(editorialUrls(store, { today: '2026-11-27' }), ['/blog/', '/news/', '/blog/2025/', '/news/2025/', '/blog/2026/', '/news/2026/']);
  assert.deepEqual(editorialUrls(store, { today: '2026-11-26' }), [], 'nothing before the embargo date');
  const sitemap = read('sitemap.xml');
  for (const u of ['/blog/', '/news/', '/blog/2025/', '/news/2026/']) assert.ok(sitemap.includes(`<loc>https://whyhumanoid.com${u}</loc>`), `${u} in the sitemap`);
  assert.doesNotMatch(sitemap, /\/newsletter\//, 'the former addresses are not in the sitemap');
  for (const f of ['index.html', 'about/index.html', 'method/index.html', 'blog/index.html', 'companies/tesla/index.html', 'app/index.html']) {
    assert.match(read(f), /<nav class="site-foot" aria-label="Site"><a href="\/blog\/">Blog<\/a><a href="\/news\/">News<\/a><a href="\/about\/">About<\/a>/, `${f}: Blog and News lead the shared footer`);
  }
  assert.match(read('index.html'), /Also: <a href="\/blog\/">Blog<\/a> · <a href="\/news\/">News<\/a>/, 'the home page points to both sections');
});

test('the former /newsletter/ addresses redirect to /blog/, noindex, and only for the Blog', () => {
  const built = views(ingested(), '2026-11-27', true);
  assert.match(built.get('newsletter/index.html'), /url=\/blog\/"/);
  assert.match(built.get('newsletter/2025/index.html'), /url=\/blog\/2025\/"/);
  assert.match(built.get('newsletter/nl-2025-03-12-synthetic-first/index.html'), /noindex[\s\S]*url=\/blog\/nl-2025-03-12-synthetic-first\/"/);
  assert.equal(built.has('newsletter/nl-2026-01-20-synthetic-second/index.html'), false, 'no alias for an unpublished article');
  assert.equal([...built.keys()].filter((f) => f.startsWith('newsletter/')).length, 4);
  for (const f of ['newsletter/index.html', 'newsletter/2025/index.html', 'newsletter/2026/index.html']) assert.match(read(f), /<meta http-equiv="refresh" content="0; url=\/blog\//, `${f} committed as a redirect`);
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
  assert.deepEqual(again.changes, { added: [], changed: [], unchanged: ['nl-2025-03-12-synthetic-first', 'nl-2026-01-20-synthetic-second'], originals: [], item_identity_changed: [] });
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
  both.editions[1].translation = { ...both.editions[1].translation, status: 'reviewed', reviewed_by: 'Synthetic reviewer', reviewed_on: '2026-11-23', review_evidence: 'SYNTHETIC FIXTURE: compared.' };
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
  assert.ok(planIngest(store, reordered).problems.some((p) => /change count, order or identity; pass --accept-item-change/.test(p)));
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
  bad((p) => { p.editions[0].edition_id = 'nl-2024-03-12-old'; p.editions[0].published_on = '2024-03-12'; p.inventory[0].edition_id = 'nl-2024-03-12-old'; p.inventory[0].published_on = '2024-03-12'; }, /outside the scope years 2025, 2026|in the scope years 2025, 2026/);
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
  const edition = built.get('blog/nl-2025-03-12-synthetic-first/index.html');
  assert.match(edition, /First published in Spanish on <time datetime="2025-03-12">12 March 2025<\/time> · English translation dated <time datetime="2026-11-20">20 November 2026<\/time>/);
  assert.match(edition, /<a href="https:\/\/newsletter\.example\.com\/p\/synthetic-first" rel="noopener noreferrer">Original edition<\/a>/);
  assert.match(edition, /<ol class="ed-items"><li value="1"><a href="\/news\/nl-2025-03-12-synthetic-first\/01\/">Same headline in two editions<\/a><\/li><li value="2">/);
  assert.doesNotMatch(edition, /Edición sintética|FIXTURE SINTÉTICO/, 'the Spanish original is never rendered');
  const item = built.get('news/nl-2025-03-12-synthetic-first/02/index.html');
  assert.match(item, /News · item 2 of 2/);
  assert.match(item, /From the Blog article <a href="\/blog\/nl-2025-03-12-synthetic-first\/">Synthetic fixture edition one<\/a>/);
  assert.match(item, /rel="prev">Previous item<\/a><span><\/span>/);
  assert.equal(built.has('blog/nl-2026-01-20-synthetic-second/index.html'), false, 'a draft translation is not published');
  const list = built.get('blog/index.html');
  assert.match(list, /<form class="ed-search" role="search" hidden/);
  assert.match(list, /<h3 id="m-2025-03">March 2025<\/h3>/);
  assert.match(list, /data-ed-text="synthetic fixture edition one/);
  assert.match(built.get('blog/2026/index.html'), /No blog articles are published here yet/);
  assert.match(built.get('news/2025/index.html'), /<ol class="ed-items"><li value="1" data-ed-text=/);
  for (const html of built.values()) assert.match(html, /noindex/);
  assert.deepEqual(editorialUrls(store), []);
  const published = { ...store, config: { ...store.config, published: true } };
  assert.deepEqual(editorialUrls(published, { today: '2026-11-26' }), [], 'the switch alone does not publish before the embargo date');
  for (const html of views(published, '2026-11-26').values()) assert.match(html, /noindex/);
  assert.ok(editorialUrls(published, { today: '2026-11-27' }).includes('/news/nl-2025-03-12-synthetic-first/01/'));
  for (const html of views(published, '2026-11-27').values()) assert.doesNotMatch(html, /noindex/);
});

test('coverage counts by year, exceptions included, and never declares completeness by itself', () => {
  const c = coverage(ingested());
  assert.deepEqual([c.years[2025].ingested, c.years[2026].ingested, c.years[2026].inaccessible], [1, 1, 1]);
  assert.deepEqual(c.years[2025].translations, { reviewed: 1, draft: 0 });
  assert.equal(c.years[2025].ready_news_items, 2);
  assert.equal(c.complete, false);
});

test('embargo: the switch is refused before embargo_until (Europe/Madrid) and the date must be valid', () => {
  const store = readStore(root);
  assert.ok(storeProblems(store, { today: '2026-11-26' }).some((p) => /published before the embargo date/.test(p)), 'the committed switch would be refused a day early');
  const on = { ...store, config: { ...store.config, published: true } };
  assert.ok(storeProblems(on, { today: '2026-11-26' }).some((p) => /published before the embargo date 2026-11-27/.test(p)));
  assert.deepEqual(storeProblems(on, { today: '2026-11-27' }), []);
  assert.ok(storeProblems({ ...store, config: { ...store.config, embargo_until: '27/11/2026' } }).some((p) => /embargo_until must be YYYY-MM-DD/.test(p)));
  assert.equal(isLive(on.config, '2026-11-26'), false);
  assert.equal(isLive(on.config, '2026-11-27'), true);
  assert.equal(isLive(store.config, '2026-11-26'), false, 'the committed switch waits for the embargo date');
  assert.equal(isLive(store.config, '2026-11-27'), true, 'and is live from it');
  assert.equal(madridToday(new Date('2026-11-26T23:30:00Z')), '2026-11-27', 'midnight in Madrid, not UTC');
});

test('a complete inventory needs evidence: listing pages, source, files, every edition accounted for, a reviewer', () => {
  const bare = { source: {}, editions: [], pagination: { pages: [], exhausted: true }, complete: true, completeness: { declared_by: 'reviewer', declared_on: '2026-11-26' } };
  const p = inventoryProblems(bare);
  for (const re of [/complete needs the listing pages read/, /complete needs source\.listing_url/, /complete needs source\.retrieved_on/, /complete needs source\.files/, /complete with no edition listed/, /complete needs completeness\.evidence/]) assert.ok(p.some((x) => re.test(x)), `${re}`);
  const pkg = fixture();
  pkg.inventory = pkg.inventory.filter((e) => e.status !== 'pending');
  pkg.source.pagination.exhausted = true;
  pkg.complete = true;
  pkg.completeness = { declared_by: 'Codex', declared_on: '2026-11-26', evidence: 'SYNTHETIC FIXTURE: every listing page read, each edition matched to a URL.' };
  const { problems, next } = planIngest(emptyStore(), pkg);
  assert.deepEqual(problems, []);
  assert.deepEqual(next.inventory.source.files, pkg.source.files, 'the converted documents and their hashes are kept as provenance');
  assert.equal(coverage(next).complete, true);
  const early = { ...pkg, completeness: { ...pkg.completeness, declared_on: '2026-11-25' } };
  assert.ok(planIngest(emptyStore(), early).problems.some((x) => /declared before the listing was read/.test(x)));
  const badHash = { ...fixture(), source: { ...fixture().source, files: [{ name: 'x.md', sha256: 'abc' }] } };
  assert.ok(planIngest(emptyStore(), badHash).problems.some((x) => /source\.files must list/.test(x)));
});

test('a same-count reorder of News items (English and original alike) is an identity change, never silent', () => {
  const draft = fixture();
  draft.editions[0].translation = { ...draft.editions[0].translation, status: 'draft', reviewed_by: null, reviewed_on: null, review_evidence: null };
  const store = ingested(draft);
  const reversed = JSON.parse(JSON.stringify(draft));
  const flip = (items) => items.reverse().map((it, i) => ({ ...it, position: i + 1 }));
  reversed.editions[0].more_news.items = flip(reversed.editions[0].more_news.items);
  reversed.editions[0].original.more_news.items = flip(reversed.editions[0].original.more_news.items);
  const refused = planIngest(store, reversed);
  assert.ok(refused.problems.some((p) => /nl-2025-03-12-synthetic-first: the News items change count, order or identity/.test(p)), JSON.stringify(refused.problems));
  const accepted = planIngest(store, reversed, { acceptItems: ['nl-2025-03-12-synthetic-first'] });
  assert.deepEqual(accepted.problems, []);
  assert.deepEqual(accepted.changes.item_identity_changed, ['nl-2025-03-12-synthetic-first']);
  // A typo fixed in an item's text keeps its identity (its links).
  const typo = JSON.parse(JSON.stringify(draft));
  typo.editions[0].more_news.items[0].body_markdown = typo.editions[0].more_news.items[0].body_markdown.replace('item with', 'item, with');
  assert.deepEqual(planIngest(store, typo).problems, []);
  // Live on the site: no flag moves a story off its address.
  const live = { ...ingested(), config: { published: true, embargo_until: '2000-01-01', scope: { years: [2025, 2026] } } };
  const liveFlip = fixture();
  liveFlip.editions[0].more_news.items = flip(liveFlip.editions[0].more_news.items);
  liveFlip.editions[0].original.more_news.items = flip(liveFlip.editions[0].original.more_news.items);
  assert.ok(planIngest(live, liveFlip, { accept: ['nl-2025-03-12-synthetic-first'], acceptItems: ['nl-2025-03-12-synthetic-first'] }).problems.some((p) => /live on the site/.test(p)));
});

test('the year scope is configurable from 2025 onwards; the historical default is 2025 and 2026', () => {
  assert.deepEqual(DEFAULT_YEARS, [2025, 2026]);
  assert.deepEqual(readStore(root).config.scope.years, [2025, 2026]);
  const pkg = fixture();
  pkg.inventory.push({ edition_id: 'nl-2027-01-06-synthetic-next', source_url: 'https://newsletter.example.com/p/next', published_on: '2027-01-06', status: 'pending', note: null });
  assert.ok(planIngest(emptyStore(), pkg).problems.some((p) => /scope years 2025, 2026/.test(p)), '2027 is refused until the scope is extended');
  const wider = { ...emptyStore(), config: { ...emptyStore().config, scope: { years: [2025, 2026, 2027] } } };
  assert.deepEqual(planIngest(wider, pkg).problems, []);
  assert.ok(Object.keys(coverage(planIngest(wider, pkg).next).years).includes('2027'));
  assert.ok(views(planIngest(wider, pkg).next).has('blog/2027/index.html'));
  const bad = { ...emptyStore(), config: { ...emptyStore().config, scope: { years: [2025, 2027] } } };
  assert.ok(storeProblems(bad).some((p) => /scope\.years must be consecutive years from 2025/.test(p)));
});

test('a reviewed translation names its reviewer (agent or person) and records the review evidence', () => {
  const pkg = fixture();
  pkg.editions[0].translation = { ...pkg.editions[0].translation, reviewed_by: 'Codex', review_evidence: null };
  assert.ok(planIngest(emptyStore(), pkg).problems.some((p) => /records review_evidence/.test(p)));
  pkg.editions[0].translation.review_evidence = 'SYNTHETIC FIXTURE: compared with the archived original.';
  assert.deepEqual(planIngest(emptyStore(), pkg).problems, [], 'an agent reviewer is accepted');
});

test('links keep balanced parentheses and query strings, for validation, hashes and rendering alike', () => {
  const md = 'See the [Official source](https://example.com/a_(b)) and https://example.com/c_(d). Also (https://example.com/e) and [q](https://example.com/?a=1&b=2 "title").';
  assert.deepEqual(urlsIn(md), ['https://example.com/?a=1&b=2', 'https://example.com/a_(b)', 'https://example.com/c_(d)', 'https://example.com/e']);
  assert.deepEqual(findLinks(md).map((l) => l.url), ['https://example.com/a_(b)', 'https://example.com/?a=1&b=2']);
  assert.deepEqual(markdownProblems(md, 'x'), []);
  const html = inline(md);
  assert.match(html, /<a href="https:\/\/example\.com\/a_\(b\)" rel="noopener noreferrer">Official source<\/a> and <a href="https:\/\/example\.com\/c_\(d\)"/);
  assert.match(html, /\(<a href="https:\/\/example\.com\/e" rel="noopener noreferrer">https:\/\/example\.com\/e<\/a>\)/);
  assert.match(html, /<a href="https:\/\/example\.com\/\?a=1&amp;b=2" rel="noopener noreferrer">q<\/a>\.$/);
  assert.doesNotMatch(html, /a_\(b"|\)\)/, 'no truncated URL, no stray parenthesis');
  // Preservation against the original compares full URLs: a parenthesis lost in translation is caught.
  const pkg = fixture();
  pkg.editions[0].body_markdown += ' [x](https://example.com/a_(b))';
  pkg.editions[0].original.body_markdown += ' [x](https://example.com/a_(b))';
  assert.deepEqual(planIngest(emptyStore(), pkg).problems, []);
  pkg.editions[0].body_markdown = pkg.editions[0].body_markdown.replace('a_(b)', 'a_(c)');
  assert.ok(planIngest(emptyStore(), pkg).problems.some((p) => /does not keep exactly the links of the original/.test(p)));
});
