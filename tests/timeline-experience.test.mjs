import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineModel,
  getScrollState,
} from '../src/components/portfolio/TimelineExperience/model.js';
import {
  abbreviateTimelineRailLabel,
  DESKTOP_BREAKPOINT,
  getMobileJumpOffset,
  MOBILE_DESKTOP_HINT,
  shouldUseMobileTimeline,
} from '../src/components/portfolio/TimelineExperience/constants.ts';
import { serializeTimelineEntry } from '../src/components/portfolio/TimelineExperience/serialize.js';

const entries = [
  {
    type: 'education',
    start: '2019-10',
    end: '2023-06',
    title: 'BSc in Industrial Engineering',
    institution: 'KIT',
    lat: 49.0069,
    lng: 8.4037,
    description: 'Bachelor',
  },
  {
    type: 'professional',
    start: '2022-03',
    end: '2022-09',
    title: 'Student Data Scientist',
    company: 'ICIS',
    lat: 49.0069,
    lng: 8.4037,
    description: 'Work',
  },
  {
    type: 'education',
    start: '2025-07',
    end: '2025-12',
    title: 'Exchange Program',
    institution: 'Adelaide',
    lat: -34.9285,
    lng: 138.6007,
    description: 'Exchange',
  },
];

test('buildTimelineModel sorts entries and creates intro plus gap chapters', () => {
  const model = buildTimelineModel(entries);

  assert.deepEqual(
    model.entries.map((entry) => entry.title),
    ['BSc in Industrial Engineering', 'Student Data Scientist', 'Exchange Program']
  );
  assert.equal(model.totalUnits, 4.1);
  assert.equal(model.segments[0].kind, 'intro');
  assert.equal(model.segments[1].kind, 'entry');
  assert.equal(model.segments[2].kind, 'gap');
  assert.equal(model.segments.at(-1).kind, 'entry');
});

test('buildTimelineModel maps entries to normalized rail positions and city keys', () => {
  const model = buildTimelineModel(entries);

  assert.equal(model.entries[0].railX, 0);
  assert.ok(Math.abs(model.entries[2].railX - 0.82) < 1e-9);
  assert.equal(model.entries[0].cityKey, 'karlsruhe');
  assert.equal(model.entries[2].cityKey, 'adelaide');
});

test('getScrollState parks on entry during entry segment and interpolates during gaps', () => {
  const model = buildTimelineModel(entries);

  const introEnd = model.segments[0].end;
  const firstEntryMid = introEnd + (model.segments[1].end - introEnd) / 2;
  const gapMid = model.segments[2].start + (model.segments[2].end - model.segments[2].start) / 2;

  const entryState = getScrollState(model, firstEntryMid);
  const gapState = getScrollState(model, gapMid);

  assert.equal(entryState.activeIndex, 0);
  assert.equal(entryState.phase, 'entry');
  assert.equal(entryState.playheadX, model.entries[0].railX);

  assert.equal(gapState.phase, 'gap');
  assert.equal(gapState.activeIndex, 0);
  assert.ok(gapState.playheadX > model.entries[0].railX);
  assert.ok(gapState.playheadX < model.entries[1].railX);
  assert.ok(Math.abs(gapState.transitionProgress - 0.5) < 1e-9);
});

test('getScrollState hands off to the incoming entry in the second half of a gap', () => {
  const model = buildTimelineModel(entries);
  const gap = model.segments[2];
  const gapLate = gap.start + (gap.end - gap.start) * 0.8;

  const state = getScrollState(model, gapLate);

  assert.equal(state.phase, 'gap');
  assert.equal(state.activeIndex, 1);
  assert.equal(state.activeTrack, 'professional');
});

test('serializeTimelineEntry maps frontmatter fields and rendered markdown html', () => {
  const entry = serializeTimelineEntry({
    id: '2024-03-fraunhofer-sit.md',
    data: {
      type: 'professional',
      start: '2024-03',
      end: '2025-02',
      title: 'Student Research Assistant - MaLeFiz Project',
      company: 'Fraunhofer SIT',
      location: 'Darmstadt, Germany',
      lat: 49.8728,
      lng: 8.6512,
      skills: ['Python', 'Machine Learning'],
      logo: '/img/logos/sit.webp',
      website: 'https://www.sit.fraunhofer.de/',
    },
  }, '<p>Rendered markdown body</p>');

  assert.deepEqual(entry, {
    type: 'professional',
    start: '2024-03',
    end: '2025-02',
    title: 'Student Research Assistant - MaLeFiz Project',
    company: 'Fraunhofer SIT',
    location: 'Darmstadt, Germany',
    lat: 49.8728,
    lng: 8.6512,
    description: '<p>Rendered markdown body</p>',
    skills: ['Python', 'Machine Learning'],
    logo: '/img/logos/sit.webp',
    website: 'https://www.sit.fraunhofer.de/',
  });
});

test('timeline switches to mobile layout below the site-wide md breakpoint', () => {
  assert.equal(DESKTOP_BREAKPOINT, 768);
  assert.equal(shouldUseMobileTimeline(767), true);
  assert.equal(shouldUseMobileTimeline(768), false);
});

test('mobile timeline hint copy stays subtle and desktop-oriented', () => {
  assert.match(MOBILE_DESKTOP_HINT, /best experienced on a wider screen/i);
});

test('mobile rail labels abbreviate long company and institution names', () => {
  assert.equal(abbreviateTimelineRailLabel('ICIS Tschach Solutions'), 'ICIS');
  assert.equal(abbreviateTimelineRailLabel('Institute of Econometrics, KIT'), 'KIT');
  assert.equal(abbreviateTimelineRailLabel('Karlsruhe Institute of Technology (KIT)'), 'KIT');
  assert.equal(abbreviateTimelineRailLabel('Fraunhofer Institute for Secure Information Technology (SIT)'), 'Fraunhofer SIT');
  assert.equal(abbreviateTimelineRailLabel('University of Mannheim'), 'Mannheim');
});

test('mobile jump offset leaves extra room below the sticky rail', () => {
  assert.equal(getMobileJumpOffset(88), 244);
  assert.equal(getMobileJumpOffset(96), 252);
});
