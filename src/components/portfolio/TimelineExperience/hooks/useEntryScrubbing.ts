import { useMemo } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import type { RefObject } from 'react';

import { buildTimelineModel, getScrollState } from '../model.js';
import type { ScrollState, TimelineEntry, TimelineModel } from '../types';

const EMPTY_MODEL: TimelineModel = {
  entries: [],
  segments: [{ kind: 'intro', start: 0, end: 1 }],
  totalUnits: 0.5,
  config: { introUnits: 0.5, entryUnits: 1, gapUnits: 0.3 },
};

const EMPTY_STATE: ScrollState = {
  phase: 'intro',
  activeIndex: null,
  activeTrack: null,
  playheadX: 0,
  transitionProgress: 0,
};

export function useEntryScrubbing(entries: TimelineEntry[], targetRef: RefObject<HTMLElement | null>) {
  const model = useMemo(() => (entries.length > 0 ? buildTimelineModel(entries) : EMPTY_MODEL), [entries]);
  const [state, setState] = useState<ScrollState>(EMPTY_STATE);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setState(getScrollState(model, value));
  });

  return { model, state, scrollYProgress };
}
