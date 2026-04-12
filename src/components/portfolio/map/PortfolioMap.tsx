// src/components/portfolio/map/PortfolioMap.tsx
import { useRef, useEffect, useState } from 'react';
import { useScroll } from 'framer-motion';
import { CHAPTERS, TOTAL_DURATION } from './constants';
import { useChapterTracking } from './hooks/useChapterTracking';
import { useSwipeScroll } from './hooks/useSwipeScroll';
import { useKeyboardScroll } from './hooks/useKeyboardScroll';
import { BackgroundLayers } from './BackgroundLayers';
import { PinLayer } from './PinLayer';
import { UILayer } from './UILayer';
import type { TimelineEntry } from './types';

const MOBILE_BP = 640; // px

export default function PortfolioMap() {
  const [entries, setEntries]  = useState<TimelineEntry[]>([]);
  const [vpWidth,  setVpWidth] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);

  // ── Data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/timeline.json')
      .then(r => r.json())
      .then((d: TimelineEntry[]) => setEntries(d))
      .catch(e => console.error('timeline.json load error', e));
  }, []);

  // ── Viewport width ───────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setVpWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Scroll tracking ──────────────────────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  });

  const chapterIndex = useChapterTracking(scrollYProgress);
  const chapter      = CHAPTERS[chapterIndex] ?? CHAPTERS[0];

  // ── Input handling ───────────────────────────────────────────────────────
  useSwipeScroll(outerRef);
  useKeyboardScroll(outerRef);

  const isMobile = vpWidth > 0 && vpWidth < MOBILE_BP;

  return (
    <>
      {/* Scrollbar styling + card achievement blocks */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        .card-scroll::-webkit-scrollbar { width: 4px; }
        .card-scroll::-webkit-scrollbar-track { background: transparent; }
        .card-scroll::-webkit-scrollbar-thumb { background: rgba(200,184,154,0.3); border-radius: 2px; }
        .achievement {
          margin: 8px 0;
          padding-left: 12px;
          border-left: 2px solid rgba(200,184,154,0.35);
          font-size: 0.9em;
          color: rgba(232,240,239,0.6);
        }
      `}</style>

      {/* Tall scroll container — drives all chapter transitions */}
      <div
        ref={outerRef}
        style={{ height: `${TOTAL_DURATION * 100}vh` }}
        className="relative"
      >
        {/* Sticky viewport — sits below nav, height shrunk accordingly */}
        <div
          role="region"
          aria-label="Interactive career map"
          className="sticky overflow-hidden"
          style={{ top: 'var(--nav-h, 88px)', height: 'calc(100svh - var(--nav-h, 88px))' }}
        >
          {/* Layer 0–2: base colour, satellite image, vignette */}
          <BackgroundLayers chapter={chapter} />

          {/* Layer 3: city pins */}
          <PinLayer chapter={chapter} chapterIndex={chapterIndex} />

          {/* Layer 4+: HUD — progress bar, labels, cards, timeline strip */}
          <UILayer
            chapter={chapter}
            chapterIndex={chapterIndex}
            scrollYProgress={scrollYProgress}
            entries={entries}
            isMobile={isMobile}
          />
        </div>
      </div>
    </>
  );
}
