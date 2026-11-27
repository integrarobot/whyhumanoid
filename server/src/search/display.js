// Reader-facing values in search results (27 Nov 2026). Some Investment values are recorded in Spanish. Where the
// site already shows a reviewed English wording, search results use the same one:
// - segment labels and business descriptions from tools/investment-review.json;
// - country labels from tools/display-translations.json.
// Nothing is translated here: a value without a reviewed wording is shown as recorded. The stored row, the search
// index and the API rows are not changed.

import review from '../../../tools/investment-review.json' with { type: 'json' };
import translations from '../../../tools/display-translations.json' with { type: 'json' };

const SEGMENTS = review.segments ?? {};
const DESCRIPTIONS = review.descriptions ?? {};
const COUNTRIES = translations.countries ?? {};

export function readerValues(datasetId, data) {
  if (!data || datasetId !== 'stocks') return data;
  const out = { ...data };
  if (SEGMENTS[out.segment]) out.segment = SEGMENTS[out.segment];
  if (DESCRIPTIONS[out.description]) out.description = DESCRIPTIONS[out.description];
  if (COUNTRIES[out.country]) out.country = COUNTRIES[out.country];
  return out;
}
