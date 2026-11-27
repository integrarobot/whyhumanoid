export const REPORTS_LIVE_OPEN = true;

export const REPORT_PRICE = Object.freeze({ currency: 'usd', unitAmount: 100000, display: 'US$1,000' });
export const REPORT_DEADLINE_SECONDS = 24 * 3600;

// Shown before payment, wherever a report can be ordered.
export const BEFORE_PAYMENT = 'US$1,000 · one-off payment · no subscription required. After payment, complete a private questionnaire about your company. We will email your report within 24 hours of receiving your completed questionnaire.';

export const INVESTMENT_THESIS_ID = 'investment-thesis';
export const INVESTMENT_THESIS_PRICE = Object.freeze({ currency: 'usd', unitAmount: 10000, display: 'US$100' });
export const INVESTMENT_THESIS_DELIVERY_HOURS = 72;
export const INVESTMENT_THESIS_BEFORE_PAYMENT = `US$100 · one-off payment · no subscription required. After payment, submit a private brief for one listed company in Investment. We will email your PDF within ${INVESTMENT_THESIS_DELIVERY_HOURS} hours of receiving the completed brief.`;
export const INVESTMENT_THESIS_LIMITS = 'Company research for general information. The company and research question define the brief. The report excludes personalised investment recommendations.';

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
export const INVESTMENT_THESIS = Object.freeze({
  id: INVESTMENT_THESIS_ID,
  category: 'investment',
  name: 'Investment thesis on demand',
  summary: 'A research report on one listed company. We synthesise the investment theses we can verify or build an original thesis from primary sources. The PDF covers the business, robotics exposure, financials, valuation scenarios and the evidence that would change the conclusion.',
});

export const ORDER_SERVICES = Object.freeze([...REPORT_SERVICES, INVESTMENT_THESIS]);
export const REPORT_SERVICES_BY_ID = new Map(ORDER_SERVICES.map((s) => [s.id, s]));

export const reportPrice = (id) => id === INVESTMENT_THESIS_ID ? INVESTMENT_THESIS_PRICE : REPORT_PRICE;
export const reportDeliveryHours = (id) => id === INVESTMENT_THESIS_ID ? INVESTMENT_THESIS_DELIVERY_HOURS : REPORT_DEADLINE_SECONDS / 3600;

// What the report is not (shown with the offer).
export const REPORT_LIMITS = 'A private PDF report. It does not guarantee a return on investment or contracts, and it is not an on-site safety assessment or certification.';

// Returns an empty list only when the Stripe price matches the configured service.
export function checkReportPrice(price, { mode, service }) {
  const expected = reportPrice(service);
  const problems = [];
  if (!price) return ['price not found'];
  if (price.active !== true) problems.push('price is not active');
  if (price.type !== 'one_time') problems.push(`type is ${price.type}, expected one_time`);
  if (price.currency !== expected.currency) problems.push(`currency is ${price.currency}, expected ${expected.currency}`);
  if (price.unit_amount !== expected.unitAmount) problems.push(`unit_amount is ${price.unit_amount}, expected ${expected.unitAmount}`);
  if (price.livemode !== (mode === 'live')) problems.push(`price livemode is ${price.livemode}, key mode is ${mode}`);
  return problems;
}
