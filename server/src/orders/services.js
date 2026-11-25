// The two custom reports (Javier, 25 Nov 2026): one-off US$1,000 payments, separate from the data subscription in both
// directions (a report grants no subscription; the subscription includes no report) and with no subscription needed.
// After a verified payment a private questionnaire opens; the PDF report is emailed within 24 hours of receiving the
// completed questionnaire. Payment alone does not start the clock.
//
// Checkout is refused unless the Stripe price configured for the service is exactly this: active, one-off, USD 1,000.00,
// in the key's mode. Live report checkout opens with REPORTS_LIVE_OPEN, set on 25 Nov 2026 after the whole flow passed in
// Stripe test mode for both services (payment, private questionnaire, draft and reload, submit with a fixed 24-hour
// deadline, customer and operator emails received, operator queue; Codex). Live also needs ALLOW_LIVE_CHECKOUT, the
// live one-off prices, email, the signed webhook and the operator settings (reportCheckoutState). Setting this back to
// false closes new report sales without touching paid orders.

export const REPORTS_LIVE_OPEN = true;

export const REPORT_PRICE = Object.freeze({ currency: 'usd', unitAmount: 100000, display: 'US$1,000' });
export const REPORT_DEADLINE_SECONDS = 24 * 3600;

// Shown before payment, wherever a report can be ordered.
export const BEFORE_PAYMENT = 'US$1,000 · one-off payment · no subscription required. After payment, complete a private questionnaire about your company. We will email your report within 24 hours of receiving your completed questionnaire.';

export const REPORT_SERVICES = Object.freeze([
  {
    id: 'humanoid-adoption-assessment',
    category: 'deployments',
    name: 'Robot integration diagnostic',
    summary: 'Which of your tasks are worth testing with robots, which robot approaches suit them (including alternatives to humanoids), the constraints, economics based on your inputs, and a practical plan for a pilot and next steps.',
  },
  {
    id: 'component-manufacturing-study',
    category: 'components',
    name: 'Industrial diversification report',
    summary: 'A map of your capabilities, prioritised opportunities in the robotics supply chain, potential buyers or partners where the evidence supports them, qualification gaps, scenarios based on your inputs, and a roadmap to validate them.',
  },
]);
export const REPORT_SERVICES_BY_ID = new Map(REPORT_SERVICES.map((s) => [s.id, s]));

// What the report is not (shown with the offer).
export const REPORT_LIMITS = 'A private PDF report. It does not guarantee a return on investment or contracts, and it is not an on-site safety assessment or certification.';

// Returns a list of problems; empty when the Stripe price is the one-off USD 1,000 price.
export function checkReportPrice(price, { mode }) {
  const problems = [];
  if (!price) return ['price not found'];
  if (price.active !== true) problems.push('price is not active');
  if (price.type !== 'one_time') problems.push(`type is ${price.type}, expected one_time`);
  if (price.currency !== REPORT_PRICE.currency) problems.push(`currency is ${price.currency}, expected usd`);
  if (price.unit_amount !== REPORT_PRICE.unitAmount) problems.push(`unit_amount is ${price.unit_amount}, expected ${REPORT_PRICE.unitAmount}`);
  if (price.livemode !== (mode === 'live')) problems.push(`price livemode is ${price.livemode}, key mode is ${mode}`);
  return problems;
}
