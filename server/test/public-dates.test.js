// First public dates of Datasets and Benchmarks (25 Nov 2026): the seven appended columns, their validation, the
// former header rows still accepted, and the public snapshots carrying the date with its meaning and source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MEANINGS, PUBLIC_DATE_HEADERS, precisionOf, publicDateOf, publicDateProblems } from '../src/public-dates.js';
import { DATASETS_BY_ID } from '../src/datasets.js';
import { ImportError, normalizeTab } from '../src/import/normalize.js';
import { atlasProblems as datasetProblems } from '../src/data-atlas/atlas.js';
import { atlasProblems as benchmarkProblems, PUBLIC_BENCHMARK_FIELDS } from '../src/benchmarks/atlas.js';
import { PUBLIC_RESOURCE_FIELDS } from '../src/data-atlas/atlas.js';
import { fixtureWorkbook } from './helpers.js';

const arxiv = (over = {}) => ({
  public_date: '2025-01-14', public_date_precision: 'day', public_date_meaning: 'associated_paper_first_arxiv_submission',
  public_date_source_url: 'https://arxiv.org/abs/2501.09038', public_date_locator: 'Submission history [v1]',
  public_date_checked_at: '2026-11-25', public_date_note: null, ...over,
});

test('the contract: seven columns in order, appended to Datasets and Benchmarks, the former header rows still accepted', () => {
  assert.deepEqual(PUBLIC_DATE_HEADERS, ['PUBLIC_DATE', 'PUBLIC_DATE_PRECISION', 'PUBLIC_DATE_MEANING', 'PUBLIC_DATE_SOURCE_URL', 'PUBLIC_DATE_LOCATOR', 'PUBLIC_DATE_CHECKED_AT', 'PUBLIC_DATE_NOTE']);
  for (const id of ['datasets', 'benchmarks']) {
    const spec = DATASETS_BY_ID.get(id);
    assert.deepEqual(spec.headers.slice(-7), PUBLIC_DATE_HEADERS);
    assert.deepEqual(spec.headers.slice(0, -7), spec.formerHeaders[0]);
    const values = fixtureWorkbook()[spec.tab];
    // The master with the new columns, and the master before them.
    assert.ok(normalizeTab(spec, [spec.headers, ...values.slice(1)]).rows.length > 0);
    const old = normalizeTab(spec, [spec.formerHeaders[0], ...values.slice(1).map((r) => r.slice(0, spec.formerHeaders[0].length))]);
    assert.ok(old.rows.length > 0);
    assert.equal(old.rows[0].data.public_date ?? null, null);
    // Columns out of order, renamed or extra still stop the import.
    const swapped = [...spec.headers];
    const n = swapped.length;
    [swapped[n - 2], swapped[n - 3]] = [swapped[n - 3], swapped[n - 2]];
    assert.throws(() => normalizeTab(spec, [swapped, ...values.slice(1)]), ImportError);
    assert.throws(() => normalizeTab(spec, [[...spec.headers, 'PUBLIC_DATE_EXTRA'], ...values.slice(1)]), ImportError);
  }
});

test('validation: together or not at all, precision from the format, meaning per tab, arXiv identity, never after the check', () => {
  assert.deepEqual(publicDateProblems({}, 'datasets', 'x'), []);
  assert.deepEqual(publicDateProblems(arxiv(), 'datasets', 'x'), []);
  assert.deepEqual(publicDateProblems(arxiv(), 'benchmarks', 'x'), []);
  // Galaxea: v1 on 30 Aug 2025 under the September identifier 2509.00576.
  assert.deepEqual(publicDateProblems(arxiv({ public_date: '2025-08-30', public_date_source_url: 'https://arxiv.org/abs/2509.00576' }), 'datasets', 'x'), []);
  const bad = (over, tab = 'datasets') => publicDateProblems(arxiv(over), tab, 'x').join(' | ');
  assert.match(bad({ public_date_checked_at: null }), /go together; missing PUBLIC_DATE_CHECKED_AT/);
  assert.match(publicDateProblems({ public_date_note: 'only a note' }, 'datasets', 'x').join(), /go together/);
  assert.match(bad({ public_date_precision: 'month' }), /does not match/);
  assert.match(bad({ public_date: '2025-1-14' }), /YYYY, YYYY-MM or YYYY-MM-DD/);
  assert.match(bad({ public_date: '2025-02-30' }), /YYYY, YYYY-MM or YYYY-MM-DD/);
  assert.match(bad({ public_date_meaning: 'founded' }), /is not one of/);
  assert.match(bad({ public_date_meaning: 'benchmark_release' }), /does not apply to datasets/);
  assert.match(bad({ public_date_meaning: 'data_release' }, 'benchmarks'), /does not apply to benchmarks/);
  assert.match(bad({ public_date_source_url: 'https://arxiv.org/abs/2501.09038v3' }), /no version suffix/);
  assert.match(bad({ public_date_source_url: 'http://example.org/x' }), /https/);
  assert.match(bad({ public_date: '2025-01', public_date_precision: 'month' }), /is a day/);
  assert.match(bad({ public_date: '2024-11-30' }), /cannot be the v1 submission/);
  assert.match(bad({ public_date: '2025-03-02' }), /cannot be the v1 submission/);
  assert.match(bad({ public_date: '2027-01-14', public_date_source_url: 'https://arxiv.org/abs/2701.09038' }), /after its check/);
  // A year or month as the source gives it, for a non-arXiv meaning.
  assert.deepEqual(publicDateProblems(arxiv({ public_date: '2020', public_date_precision: 'year', public_date_meaning: 'official_announcement', public_date_source_url: 'https://example.org/news' }), 'datasets', 'x'), []);
  assert.equal(precisionOf('2026-11'), 'month');
  assert.equal(precisionOf('2026-13'), null);
  assert.ok(Object.keys(MEANINGS).every((k) => !/found|review|snapshot/.test(k)));
});

test('the atlases validate the columns and publish them with their meaning and source', () => {
  const ds = { dataset_id: 'ds-x', name: 'X', included_in_atlas: 'true', resource_class: 'corpus', data_origin: 'real_robot', ...arxiv({ public_date_checked_at: null }) };
  assert.ok(datasetProblems([ds], []).some((p) => /Datasets ds-x: the public date columns go together/.test(p)));
  assert.ok(!datasetProblems([{ ...ds, public_date_checked_at: '2026-11-25' }], []).some((p) => /PUBLIC_DATE/.test(p)));
  const bm = { benchmark_id: 'bm-x', name: 'X', environment: 'Simulation', capability_tags: 'manipulation', ...arxiv({ public_date_meaning: 'data_release' }) };
  assert.ok(benchmarkProblems([bm], []).some((p) => /does not apply to benchmarks/.test(p)));
  for (const f of ['public_date', 'public_date_precision', 'public_date_meaning', 'public_date_source_url', 'public_date_locator', 'public_date_checked_at', 'public_date_note']) {
    assert.ok(PUBLIC_RESOURCE_FIELDS.includes(f) && PUBLIC_BENCHMARK_FIELDS.includes(f), f);
  }
  assert.deepEqual(publicDateOf(arxiv({ public_date_note: 'Current version v3.' })), {
    date: '2025-01-14', precision: 'day', meaning: 'associated_paper_first_arxiv_submission', meaning_label: MEANINGS.associated_paper_first_arxiv_submission.label,
    source_url: 'https://arxiv.org/abs/2501.09038', locator: 'Submission history [v1]', checked_at: '2026-11-25', note: 'Current version v3.',
  });
  assert.equal(publicDateOf({}), null);
});
