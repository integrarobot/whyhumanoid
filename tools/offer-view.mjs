// The two premium paths (Javier, 24 Nov 2026), in one place for the home page, Deployments, Components and /subscribe/:
//   A. Full data access: one data subscription, US$100 per year billed annually, no free trial (server/src/pricing.js).
//      Research and data, not a personalised recommendation.
//   B. Custom company reports: Integrarobot's analysis and judgement for one company, US$1,000 each, separate from the
//      subscription, no subscription prerequisite, and NOT available to order yet: no form, checkout or delivery promise.
// Whether new subscriptions can be bought is LIVE_SALES_OPEN; until then the subscription says it opens soon.

import { SERVICES, SUBSCRIPTION } from '../server/src/access/matrix.js';
import { LIVE_SALES_OPEN, PLAN } from '../server/src/pricing.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const OFFER_PRICE = PLAN.display; // 'US$100 per year'
export const subscriptionAction = () => (LIVE_SALES_OPEN
  ? '<a class="op-btn" href="/app/#subscribe">Subscribe for US$100 a year</a>'
  : '<span class="op-soon">New subscriptions open soon</span> <a class="op-link" href="/subscribe/">What the subscription includes</a>');

// `focus`: 'deployments' or 'components' names the report that goes with the page; null shows both.
export function offerHtml({ focus = null, heading = 'Two ways to go further', level = 2, id = 'offer' } = {}) {
  const reports = SERVICES.filter((s) => !focus || s.category === focus);
  const h = `h${level}`;
  return `<section class="offer" id="${esc(id)}" aria-labelledby="${esc(id)}-h">
<${h} class="offer-h" id="${esc(id)}-h">${esc(heading)}</${h}>
<div class="op-grid">
<article class="op op-data" aria-labelledby="${esc(id)}-a">
<p class="op-k">Full data access</p>
<h3 class="op-t" id="${esc(id)}-a">Use the evidence to make your own decisions.</h3>
<p class="op-price"><b>US$100</b> per year <span>billed annually · no free trial</span></p>
<ul class="op-list">
<li>Complete <a href="/deployments/">Deployments</a>: every case with its sites, tasks, timeline, metrics, claims and evidence.</li>
<li>Complete <a href="/components/">Components</a>: full technical passports, side-by-side comparison and technical filters.</li>
<li>Detailed search across both, and the existing API keys for agents.</li>
</ul>
<p class="op-note">Access to research and data. It does not include a personalised recommendation.</p>
<p class="op-act">${subscriptionAction()}</p>
</article>
<article class="op op-reports" aria-labelledby="${esc(id)}-b">
<p class="op-k">Custom company reports</p>
<h3 class="op-t" id="${esc(id)}-b">Our expertise, applied to your company’s decisions.</h3>
<p class="op-price"><b>US$1,000</b> per report <span>separate from the subscription · no subscription needed</span></p>
<ul class="op-list">${reports.map((s) => `<li><b>${esc(s.name)}</b> <span class="op-cat">(${esc(s.category === 'deployments' ? 'Deployments' : 'Components')})</span>: ${esc(s.summary)}</li>`).join('')}</ul>
<p class="op-note">Reports tailored to one company’s needs, where Integrarobot provides the analysis and judgement. Not included in the subscription.</p>
<p class="op-act"><span class="op-na">Not available to order yet</span> <a class="op-link" href="/subscribe/#reports">How reports differ from the subscription</a></p>
</article>
</div>
</section>`;
}

// One short line for places where the full block would be repetitive.
export const offerLine = () => `<p class="offer-line"><b>Full data access</b> ${esc(OFFER_PRICE)}, billed annually · <b>Custom company reports</b> US$1,000 each, not available to order yet · <a href="/subscribe/">Compare the two</a></p>`;
export { SUBSCRIPTION };
