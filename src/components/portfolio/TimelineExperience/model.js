const INTRO_UNITS = 0.5;
const ENTRY_UNITS = 1;
const GAP_UNITS = 0.3;
const PIN_MATCH_THRESHOLD = 0.15;
const RAIL_RIGHT_BUFFER = 0.18;

const PINS = [
  { key: 'karlsruhe', lat: 49.0069, lng: 8.4037 },
  { key: 'mannheim', lat: 49.4875, lng: 8.466 },
  { key: 'darmstadt', lat: 49.8728, lng: 8.6512 },
  { key: 'adelaide', lat: -34.9285, lng: 138.6007 },
  { key: 'frankfurt', lat: 50.1109, lng: 8.6821 },
];

function dateToNumeric(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return year + (month - 1) / 12;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function matchCityKey(entry) {
  if (entry.lat === undefined || entry.lng === undefined) return null;

  const pin = PINS.find((candidate) =>
    Math.abs(candidate.lat - entry.lat) < PIN_MATCH_THRESHOLD &&
    Math.abs(candidate.lng - entry.lng) < PIN_MATCH_THRESHOLD
  );

  return pin?.key ?? null;
}

export function buildTimelineModel(entries) {
  const sorted = [...entries].sort((a, b) => dateToNumeric(a.start) - dateToNumeric(b.start));
  const numericDates = sorted.map((entry) => dateToNumeric(entry.start));
  const minDate = Math.min(...numericDates);
  const maxDate = Math.max(...numericDates);
  const span = Math.max(maxDate - minDate, 0.01);

  const decoratedEntries = sorted.map((entry, index) => ({
    ...entry,
    index,
    railX: sorted.length === 1
      ? 0.5
      : ((dateToNumeric(entry.start) - minDate) / span) * (1 - RAIL_RIGHT_BUFFER),
    cityKey: matchCityKey(entry),
    shortTitle: entry.company ?? entry.institution ?? entry.title,
  }));

  const segments = [];
  let cursor = 0;

  segments.push({ kind: 'intro', start: cursor, end: cursor + INTRO_UNITS });
  cursor += INTRO_UNITS;

  decoratedEntries.forEach((entry, index) => {
    segments.push({ kind: 'entry', entryIndex: index, start: cursor, end: cursor + ENTRY_UNITS });
    cursor += ENTRY_UNITS;

    if (index < decoratedEntries.length - 1) {
      segments.push({ kind: 'gap', fromIndex: index, toIndex: index + 1, start: cursor, end: cursor + GAP_UNITS });
      cursor += GAP_UNITS;
    }
  });

  const totalUnits = cursor;
  const normalizedSegments = segments.map((segment) => ({
    ...segment,
    start: segment.start / totalUnits,
    end: segment.end / totalUnits,
  }));

  return {
    entries: decoratedEntries,
    segments: normalizedSegments,
    totalUnits,
    config: {
      introUnits: INTRO_UNITS,
      entryUnits: ENTRY_UNITS,
      gapUnits: GAP_UNITS,
    },
  };
}

export function getScrollState(model, progress) {
  const normalized = clamp(progress, 0, 1);
  const segment = model.segments.find((candidate) => normalized >= candidate.start && normalized <= candidate.end)
    ?? model.segments.at(-1);

  if (segment.kind === 'intro') {
    return {
      phase: 'intro',
      activeIndex: null,
      activeTrack: null,
      playheadX: 0,
      transitionProgress: 0,
    };
  }

  if (segment.kind === 'entry') {
    const entry = model.entries[segment.entryIndex];
    return {
      phase: 'entry',
      activeIndex: segment.entryIndex,
      activeTrack: entry.type,
      playheadX: entry.railX,
      transitionProgress: 1,
    };
  }

  const fromEntry = model.entries[segment.fromIndex];
  const toEntry = model.entries[segment.toIndex];
  const localProgress = clamp((normalized - segment.start) / (segment.end - segment.start || 1), 0, 1);
  const playheadX = fromEntry.railX + (toEntry.railX - fromEntry.railX) * localProgress;
  const activeIndex = localProgress < 0.5 ? segment.fromIndex : segment.toIndex;

  return {
    phase: 'gap',
    activeIndex,
    activeTrack: model.entries[activeIndex].type,
    playheadX,
    transitionProgress: localProgress,
  };
}
