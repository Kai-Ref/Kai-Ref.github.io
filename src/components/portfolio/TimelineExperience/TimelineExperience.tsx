import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MobileStack } from './MobileStack';
import { TimelineRail } from './TimelineRail';
import { InlineEntry } from './InlineEntry';
import { CityMinimap } from './CityMinimap';
import { DESKTOP_BREAKPOINT, TIMELINE_ZONE, shouldUseMobileTimeline } from './constants';
import { useEntryScrubbing } from './hooks/useEntryScrubbing';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useReducedMotionPreference } from './hooks/useReducedMotion';
import styles from './styles.module.css';
import type { TimelineSerializedEntry } from './types';

export default function TimelineExperience({ initialEntries }: { initialEntries: TimelineSerializedEntry[] }) {
  const [isMobile, setIsMobile] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railBandRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<Array<HTMLElement | null>>([]);
  const reducedMotion = useReducedMotionPreference();
  const { model, state } = useEntryScrubbing(initialEntries, stageRef);

  const getJumpTargetTop = useCallback(() => {
    const railBottom = railBandRef.current?.getBoundingClientRect().bottom;
    if (railBottom) return railBottom + 40;

    const navHeightVar = getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim();
    const navHeight = Number.parseFloat(navHeightVar) || 88;
    return navHeight + 96;
  }, []);

  useEffect(() => {
    const update = () => setIsMobile(shouldUseMobileTimeline(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const jumpToIndex = useCallback((index: number) => {
    if (index < 0 || index >= model.entries.length) return;
    const target = entryRefs.current[index];
    if (!target) return;

    const anchor = target.querySelector<HTMLElement>('[data-inline-entry-anchor="true"]') ?? target;
    const top = window.scrollY + anchor.getBoundingClientRect().top - getJumpTargetTop();

    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [getJumpTargetTop, model.entries.length, reducedMotion]);

  useKeyboardNav({ count: model.entries.length, activeIndex: visibleIndex ?? state.activeIndex, onJump: jumpToIndex, isEnabled: true });

  useEffect(() => {
    if (isMobile) return;

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const nextIndex = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(nextIndex)) setVisibleIndex(nextIndex);
      },
      {
        threshold: [0.2, 0.4, 0.6, 0.8],
        rootMargin: '-16% 0px -24% 0px',
      }
    );

    entryRefs.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [isMobile, model.entries.length]);

  const railActiveIndex = state.phase === 'intro' ? null : (visibleIndex ?? state.activeIndex);
  const railPlayheadX = railActiveIndex === null ? state.playheadX : (model.entries[railActiveIndex]?.railX ?? state.playheadX);
  const activeEntry = railActiveIndex === null ? null : model.entries[railActiveIndex] ?? null;

  const liveText = useMemo(() => {
    if (!activeEntry) return 'Timeline ready. Scroll to begin.';
    const meta = activeEntry.company ?? activeEntry.institution ?? '';
    return `Now viewing ${activeEntry.title}${meta ? ` at ${meta}` : ''}.`;
  }, [activeEntry]);

  if (isMobile) {
    return <MobileStack entries={initialEntries} reducedMotion={reducedMotion} />;
  }

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveText}
      </div>

      <section
        ref={stageRef}
        data-timeline-root="true"
        className={`${styles.timelineRoot} relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip`}
      >
        <div className={styles.stickyStage}>
          <div className={styles.railFade} />
          <div className={styles.contentInner}>
            <div ref={railBandRef} className={`${styles.railBand} relative flex items-stretch`} style={{ height: TIMELINE_ZONE.rail }}>
              <TimelineRail
                entries={model.entries}
                activeIndex={railActiveIndex}
                playheadX={railPlayheadX}
                introComplete={state.phase !== 'intro'}
                onJump={jumpToIndex}
                reducedMotion={reducedMotion}
              />
            </div>

            {state.phase === 'intro' && (
              <div className={styles.introOverlay}>
                <div className={styles.introWrap}>
                  <p className={styles.introKicker}>Experience Atlas</p>
                  <h1 className={styles.introTitle}>A chronology of my academic and professional journey.</h1>
                  <p className={styles.introDeck}>
                    Scroll to move through each chapter.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.inlineEntriesWrap}>
          {model.entries.map((entry, index) => (
            <section
              key={`${entry.title}-${entry.start}`}
              ref={(element) => {
                entryRefs.current[index] = element;
              }}
              data-index={index}
              className={styles.inlineEntrySection}
            >
              <InlineEntry
                entry={entry}
                isActive={railActiveIndex === index}
                sidebarSlot={
                  entry.cityKey ? (
                    <CityMinimap cityKey={entry.cityKey} reducedMotion={reducedMotion} fixedSize={{ width: '100%', height: 170 }} />
                  ) : null
                }
              />
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
