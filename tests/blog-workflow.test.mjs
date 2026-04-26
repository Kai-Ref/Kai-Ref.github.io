import test from 'node:test';
import assert from 'node:assert/strict';

import {
  slugify,
  parseSimpleYaml,
  pickSourceFormat,
  rewriteImagePaths,
  toBoolean,
} from '../scripts/blog/lib/workflow.mjs';

test('slugify creates URL-safe slug', () => {
  assert.equal(slugify('Probabilistic Time Series Forecasting'), 'probabilistic-time-series-forecasting');
  assert.equal(slugify('  Latex + Bib Workflow  '), 'latex-bib-workflow');
});

test('parseSimpleYaml parses scalar and list values', () => {
  const raw = [
    'title: My Post',
    'pubDate: 2026-04-26',
    'draft: true',
    'tags:',
    '  - LTSF',
    '  - Literature Review',
  ].join('\n');

  const parsed = parseSimpleYaml(raw);

  assert.equal(parsed.title, 'My Post');
  assert.equal(parsed.pubDate, '2026-04-26');
  assert.equal(parsed.draft, 'true');
  assert.deepEqual(parsed.tags, ['LTSF', 'Literature Review']);
});

test('pickSourceFormat respects explicit format and fallback priority', () => {
  assert.equal(
    pickSourceFormat({
      explicit: 'md',
      available: { qmd: true, tex: true, md: true },
      hint: 'tex',
    }),
    'md'
  );

  assert.equal(
    pickSourceFormat({
      explicit: undefined,
      available: { qmd: false, tex: true, md: true },
      hint: undefined,
    }),
    'tex'
  );
});

test('rewriteImagePaths maps draft assets to public post assets', () => {
  const input = [
    '![Hero](assets/images/hero.png)',
    '![Plot](./assets/images/charts/plot.png)',
    '<img src="assets/images/inline.png" alt="inline" />',
  ].join('\n');
  const output = rewriteImagePaths(input, 'my-post');

  assert.match(output, /\/img\/posts\/my-post\/hero.png/);
  assert.match(output, /\/img\/posts\/my-post\/charts\/plot.png/);
  assert.match(output, /src="\/img\/posts\/my-post\/inline.png"/);
});

test('toBoolean converts common values', () => {
  assert.equal(toBoolean('true', false), true);
  assert.equal(toBoolean('yes', false), true);
  assert.equal(toBoolean('0', true), false);
  assert.equal(toBoolean(undefined, true), true);
});
