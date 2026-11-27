// Blog (/blog/) and News (/news/) pages, built by tools/build-pages.mjs with its own page frame. The Blog holds the
// articles of the Integrarobot newsletter (named Blog on the site, Javier, 27 Nov 2026); /newsletter/ addresses are
// kept as noindex redirects to the matching /blog/ address. Edition ids keep their nl- prefix.
// Input: the editions readyEditions() returns (English, reviewed). Spanish originals never reach this module.
//
// Markdown is rendered by a small safe renderer: every character of the source is escaped, and only a fixed set of
// constructs becomes markup (paragraphs, ## and ### headings, lists, quotes, bold, italic, code, http(s) links).
// Raw HTML is refused by validation before it gets here; anything else that slips through is shown as text.
import { BARE_URL, findLinks, isLive, linkTarget, madridToday, readyEditions, trimUrl, yearsOf } from './editorial-model.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (d) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const webUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; } };

// ---------- safe Markdown ----------
function emphasis(escaped) {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
}
const anchor = (url, label) => `<a href="${esc(url)}" rel="noopener noreferrer">${label}</a>`;
function bare(text) {
  // Text outside Markdown links: escape, link bare http(s) URLs, then emphasis.
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(BARE_URL)) {
    const url = trimUrl(m[0]);
    parts.push(emphasis(esc(text.slice(last, m.index))), anchor(url, esc(url)));
    last = m.index + url.length;
  }
  parts.push(emphasis(esc(text.slice(last))));
  return parts.join('');
}
export function inline(text) {
  const s = String(text ?? '');
  const out = [];
  let last = 0;
  for (const { start, end, image, label, url } of findLinks(s)) {
    out.push(bare(s.slice(last, start)));
    if (!linkTarget(url)) out.push(esc(s.slice(start, end)));
    else out.push(anchor(url, image ? `Image: ${esc(label || url)}` : emphasis(esc(label || url))));
    last = end;
  }
  out.push(bare(s.slice(last)));
  return out.join('');
}
export function renderMarkdown(markdown) {
  const blocks = String(markdown ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    const lines = b.split('\n');
    const h = b.match(/^(#{1,6})\s+(.+)$/);
    if (h && lines.length === 1) return h[1].length <= 2 ? `<h2>${inline(h[2])}</h2>` : `<h3>${inline(h[2])}</h3>`;
    if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*+]\s+/, ''))}</li>`).join('')}</ul>`;
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
    if (lines.every((l) => /^\s*>/.test(l))) return `<blockquote><p>${inline(lines.map((l) => l.replace(/^\s*>\s?/, '')).join(' '))}</p></blockquote>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('\n');
}
// The first substantive paragraph as plain text, for lists and descriptions. Headings, blocks made only of images
// (whose alt text, often just "Image", is no teaser) and the placeholder left where a video was embedded are skipped;
// the article itself is rendered whole elsewhere.
const VIDEO_PLACEHOLDER = /^\[[^\]]*\b(?:video|audio)\b[^\]]*\]$/i;
const plainText = (block) => {
  let plain = '';
  let last = 0;
  for (const l of findLinks(block)) { plain += block.slice(last, l.start) + (l.image ? ' ' : l.label); last = l.end; }
  return (plain + block.slice(last)).replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
};
export function excerpt(markdown, max = 220) {
  const blocks = String(markdown ?? '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const text = blocks
    .filter((b) => !/^#{1,6}\s/.test(b) && !VIDEO_PLACEHOLDER.test(b))
    .map(plainText)
    .find((t) => /\p{L}/u.test(t)) ?? '';
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : text;
}

// ---------- paths ----------
export const editionPath = (id) => `/blog/${id}/`;
export const legacyEditionPath = (id) => `/newsletter/${id}/`;
export const itemPath = (item) => `/news/${item.id}/`;
export const yearPath = (section, y) => `/${section}/${y}/`;

// ---------- pages ----------
const searchForm = (label) => `<form class="ed-search" role="search" hidden onsubmit="return false"><label for="ed-q">${esc(label)}</label><input id="ed-q" type="search" autocomplete="off"><p class="ed-count" aria-live="polite"></p></form>`;
const yearNav = (years, section, current = null) => `<nav class="jump" aria-label="Years">${years.map((y) => (y === current ? `<span aria-current="page">${y}</span>` : `<a href="${yearPath(section, y)}">${y}</a>`)).join('')}</nav>`;
const byMonth = (list, dateOf) => {
  const groups = new Map();
  for (const x of list) { const ym = dateOf(x).slice(0, 7); groups.set(ym, [...(groups.get(ym) ?? []), x]); }
  return [...groups];
};

function editionCards(editions) {
  return byMonth(editions, (e) => e.published_on).map(([ym, list]) => `<section class="ed-month" data-ed-group><h3 id="m-${ym}">${esc(monthLabel(ym))}</h3>
<ul class="cards ed-list">${list.map((e) => `<li data-ed-text="${esc(`${e.title} ${e.subtitle ?? ''} ${excerpt(e.body_markdown, 600)}`.toLowerCase())}"><a href="${editionPath(e.id)}"><b>${esc(e.title)}</b></a><span>${esc(excerpt(e.body_markdown))}</span><span class="dim">First published in Spanish on ${esc(longDate(e.published_on))}${e.items.length ? ` · ${e.items.length} news ${e.items.length === 1 ? 'item' : 'items'}` : ''}</span></li>`).join('')}</ul></section>`).join('\n');
}
function itemGroups(editions) {
  return byMonth(editions.filter((e) => e.items.length), (e) => e.published_on).map(([ym, list]) => `<section class="ed-month" data-ed-group><h3 id="m-${ym}">${esc(monthLabel(ym))}</h3>
${list.map((e) => `<div class="ed-edition" data-ed-group><p class="meta">From the Blog article <a href="${editionPath(e.id)}">${esc(e.title)}</a>, first published in Spanish on ${esc(longDate(e.published_on))}</p>
<ol class="ed-items">${e.items.map((it) => `<li value="${it.position}" data-ed-text="${esc(`${it.headline} ${excerpt(it.body_markdown, 600)}`.toLowerCase())}"><a href="${itemPath(it)}">${esc(it.headline)}</a>${it.body_markdown ? `<span>${esc(excerpt(it.body_markdown, 180))}</span>` : ''}</li>`).join('')}</ol></div>`).join('\n')}</section>`).join('\n');
}

const BLOG_LEDE = 'Integrarobot on humanoid robots and physical AI, in English: every article of the Integrarobot newsletter from 2025 and 2026, each with the date it first appeared in Spanish and a link to the original.';
const NEWS_LEDE = 'Each item from the news roundup of the Integrarobot newsletter, in English, in the order its article gave it, with a link to that article on the Blog and to its sources.';
const NONE = (what) => `<p class="note">No ${what} are published here yet. They appear once their English text has been reviewed.</p>`;

// Every editorial page: path (repository-relative file) -> HTML. page, crumbs, assetVersion and redirect (the moved-page
// template) come from tools/build-pages.mjs.
// While the sections are not live (switch off, or before the embargo date in Europe/Madrid) every page is noindex.
export function editorialPages(store, { page, crumbs, assetVersion, redirect = null, today = madridToday() }) {
  const noindex = !isLive(store.config, today);
  const years = yearsOf(store.config);
  const editions = readyEditions(store);
  const files = new Map();
  const head = () => `<link rel="stylesheet" href="/assets/editorial.css?v=${assetVersion('assets/editorial.css')}">\n`;
  const tail = `\n<script src="/assets/editorial.js?v=${assetVersion('assets/editorial.js')}" defer></script>`;
  const items = editions.flatMap((e) => e.items.map((it) => ({ ...it, edition: e })));

  const listPage = (section, year) => {
    const list = year ? editions.filter((e) => e.published_on.startsWith(String(year))) : editions;
    const isNews = section === 'news';
    const shown = isNews ? list.filter((e) => e.items.length) : list;
    const title = isNews ? 'Robotics and physical AI news' : 'Blog';
    const body = `${year ? crumbs([[`/${section}/`, isNews ? 'News' : 'Blog'], [null, String(year)]]) : ''}<p class="kicker">${isNews ? 'News' : 'Blog'}</p>
<h1>${esc(year ? `${title}, ${year}` : title)}</h1>
<p class="lede">${esc(isNews ? NEWS_LEDE : BLOG_LEDE)}</p>
${yearNav(years, section, year)}
${shown.length ? `${searchForm(isNews ? 'Search the news' : 'Search the blog')}\n${isNews ? itemGroups(shown) : editionCards(shown)}` : NONE(isNews ? 'news items' : 'blog articles')}`;
    const path = year ? yearPath(section, year) : `/${section}/`;
    return page({ title: `${year ? `${title}, ${year}` : title} · Why Humanoid?`, description: isNews ? NEWS_LEDE : BLOG_LEDE, path, body, noindex, head: head(), tail });
  };
  for (const section of ['blog', 'news']) {
    files.set(`${section}/index.html`, listPage(section, null));
    for (const y of years) files.set(`${section}/${y}/index.html`, listPage(section, y));
  }

  for (const e of editions) {
    const year = e.published_on.slice(0, 4);
    const news = e.more_news_status === 'present'
      ? `<section class="ed-news"><h2>News in this edition</h2><ol class="ed-items">${e.items.map((it) => `<li value="${it.position}"><a href="${itemPath(it)}">${esc(it.headline)}</a></li>`).join('')}</ol></section>`
      : e.more_news_status === 'inaccessible'
        ? `<section class="ed-news"><h2>News in this edition</h2><p class="meta">The news roundup of this edition could not be read from the source${e.more_news_note ? `: ${esc(e.more_news_note)}` : ''}.</p></section>`
        : `<section class="ed-news"><h2>News in this edition</h2><p class="meta">This edition has no news roundup.</p></section>`;
    const body = `${crumbs([['/blog/', 'Blog'], [yearPath('blog', year), year], [null, e.title]])}<article class="ed-article">
<p class="kicker">Blog</p>
<h1>${esc(e.title)}</h1>
${e.subtitle ? `<p class="lede">${esc(e.subtitle)}</p>\n` : ''}<p class="meta">By ${esc(e.author)} · First published in Spanish on <time datetime="${e.published_on}">${esc(longDate(e.published_on))}</time> · English translation dated <time datetime="${e.translated_on}">${esc(longDate(e.translated_on))}</time> · <a href="${esc(e.source_url)}" rel="noopener noreferrer">Original edition</a></p>
<div class="ed-body">
${renderMarkdown(e.body_markdown)}
</div>
${news}
</article>`;
    files.set(`blog/${e.id}/index.html`, page({ title: `${e.title} · Blog · Why Humanoid?`, description: excerpt(e.subtitle || e.body_markdown, 155) || BLOG_LEDE, path: editionPath(e.id), body, type: 'article', noindex, head: head() }));
  }

  for (const it of items) {
    const e = it.edition;
    const year = e.published_on.slice(0, 4);
    const prev = e.items[it.position - 2];
    const next = e.items[it.position];
    const body = `${crumbs([['/news/', 'News'], [yearPath('news', year), year], [editionPath(e.id), e.title], [null, `Item ${it.position}`]])}<article class="ed-article">
<p class="kicker">News · item ${it.position} of ${e.items.length}</p>
<h1>${esc(it.headline)}</h1>
<p class="meta">From the Blog article <a href="${editionPath(e.id)}">${esc(e.title)}</a> by ${esc(e.author)}, first published in Spanish on <time datetime="${e.published_on}">${esc(longDate(e.published_on))}</time> · English translation dated <time datetime="${e.translated_on}">${esc(longDate(e.translated_on))}</time> · <a href="${esc(e.source_url)}" rel="noopener noreferrer">Original edition</a></p>
${it.body_markdown ? `<div class="ed-body">\n${renderMarkdown(it.body_markdown)}\n</div>\n` : ''}<nav class="ed-pager" aria-label="Items in this edition">${prev ? `<a href="${itemPath(prev)}" rel="prev">Previous item</a>` : '<span></span>'}${next ? `<a href="${itemPath(next)}" rel="next">Next item</a>` : '<span></span>'}</nav>
</article>`;
    files.set(`news/${it.id}/index.html`, page({ title: `${it.headline} · News · Why Humanoid?`, description: excerpt(it.body_markdown, 155) || `News item ${it.position} of the Blog article ${e.title}.`, path: itemPath(it), body, type: 'article', noindex, head: head() }));
  }
  // Former /newsletter/ addresses: noindex redirects to the matching /blog/ address, never in the sitemap.
  if (redirect) {
    files.set('newsletter/index.html', redirect('/blog/', 'the Blog'));
    for (const y of years) files.set(`newsletter/${y}/index.html`, redirect(yearPath('blog', y), `the Blog, ${y}`));
    for (const e of editions) files.set(`${legacyEditionPath(e.id).slice(1)}index.html`, redirect(editionPath(e.id), e.title));
  }
  return files;
}

// Addresses for the sitemap: none until the sections are live (switch on and embargo date reached, Europe/Madrid).
export function editorialUrls(store, { today = madridToday() } = {}) {
  if (!isLive(store.config, today)) return [];
  const years = yearsOf(store.config);
  const editions = readyEditions(store);
  return ['/blog/', '/news/', ...years.flatMap((y) => [yearPath('blog', y), yearPath('news', y)]), ...editions.map((e) => editionPath(e.id)), ...editions.flatMap((e) => e.items.map(itemPath))];
}
