// The shared site footer links (Javier, 25 Nov 2026): one renderer for the home page (tools/build-site.mjs), every
// generated page (tools/build-pages.mjs) and the subscriber app (tools/build-app.mjs), so the footer never differs
// between them. Links only, and no email address (Javier, 25 Nov 2026): About, For agents, Method, Contact (the About
// page's contact section) and Integrarobot.

export const FOOTER_LINKS = Object.freeze([
  ['About', '/about/'],
  ['For agents', '/agents/'],
  ['Method', '/method/'],
  ['Contact', '/about/#contact'],
  ['Integrarobot', 'https://integrarobot.com'],
]);

// Uses the design tokens every surface already defines (--f-mono, --bone-2, --amber); wraps on narrow phones, with
// targets of at least 24 px and a visible keyboard focus.
export const FOOTER_CSS = '.site-foot{display:flex;flex-wrap:wrap;gap:4px 18px;margin:0 0 8px;font-family:var(--f-mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase}'
  + '.site-foot a{display:inline-block;padding:6px 0;color:var(--bone-2);text-decoration:none}'
  + '.site-foot a:hover,.site-foot a:focus-visible{color:var(--bone);text-decoration:underline;text-underline-offset:3px}'
  + '.site-foot a:focus-visible{outline:2px solid var(--amber);outline-offset:2px}';

export function renderSiteFooterNav() {
  return `<nav class="site-foot" aria-label="Site">${FOOTER_LINKS.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav>`;
}
