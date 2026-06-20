import { useEffect, useMemo, useRef, useState } from 'react';

import { CityMinimap } from './CityMinimap';
import { InlineEntry } from './InlineEntry';
import { getMobileJumpOffset, MOBILE_DESKTOP_HINT, TRACK_COLORS } from './constants';
import { buildTimelineModel } from './model.js';
import { useSwipeNav } from './hooks/useSwipeNav';
import styles from './styles.module.css';
import type { TimelineEntry } from './types';
import { WavyRail, type WavyRailDotSpec } from './WavyRail';

function CompactRail({
  entries,
  activeIndex,
  onJump,
  reducedMotion,
}: {
  entries: ReturnType<typeof buildTimelineModel>['entries'];
  activeIndex: number;
  onJump: (index: number) => void;
  reducedMotion: boolean;
}) {
  const padLeft = 12;
  const padRight = 12;
  const rangeStartX = 92;
  const trackGap = 32;
  const activeEntry = entries[activeIndex] ?? null;
  const playheadLeft = activeEntry
    ? `calc(${rangeStartX}px + (${activeEntry.railX} * (100% - ${rangeStartX + padRight}px)))`
    : `${rangeStartX}px`;
  const playheadColor = activeEntry ? TRACK_COLORS[activeEntry.type] : 'var(--ink-muted)';

  const dotRefs = useRef<Map<string, HTMLElement>>(new Map());

  const tracks = ['education', 'professional'] as const;

  return (
    <div className="relative h-full w-full">
      <span
        className={styles.mobileRailLabel}
        style={{
          left: padLeft,
          top: `calc(50% - ${trackGap / 2}px)`,
          transform: 'translateY(-50%)',
          color: 'var(--edu-color)',
        }}
      >
        Edu
      </span>
      <span
        className={styles.mobileRailLabel}
        style={{
          left: padLeft,
          top: `calc(50% + ${trackGap / 2}px)`,
          transform: 'translateY(-50%)',
          color: 'var(--pro-color)',
        }}
      >
        Pro
      </span>

      <div
        className={styles.mobilePlayhead}
        style={{ left: playheadLeft, background: playheadColor }}
        aria-hidden="true"
      />

      {tracks.map((track, trackIndex) => {
        const trackEntries = entries.filter((entry) => entry.type === track);
        const lastTrackX = trackEntries.length > 0
          ? Math.max(...trackEntries.map((entry) => entry.railX))
          : 0;
        const trackY = track === 'education'
          ? `calc(50% - ${trackGap / 2}px)`
          : `calc(50% + ${trackGap / 2}px)`;
        const solidColor = `color-mix(in srgb, ${TRACK_COLORS[track]} 55%, var(--rule))`;
        const dottedColor = `color-mix(in srgb, ${TRACK_COLORS[track]} 65%, transparent)`;
        const lastLeft = `calc(${rangeStartX}px + (${lastTrackX} * (100% - ${rangeStartX + padRight}px)))`;

        const dotSpecs: WavyRailDotSpec[] = trackEntries.map((entry) => ({
          key: `${entry.title}-${entry.start}`,
          xRatio: entry.railX,
        }));

        return (
          <div
            key={track}
            className="absolute"
            style={{ left: 0, right: 0, top: trackY, transform: 'translateY(-50%)' }}
          >
            <WavyRail
              rangeStartXPx={rangeStartX}
              padRightPx={padRight}
              lastEntryRatio={lastTrackX}
              color={solidColor}
              phaseSeed={trackIndex === 0 ? 1.7 : 4.3}
              amplitudePx={6}
              taperPx={56}
              canvasHeight={28}
              reducedMotion={reducedMotion}
              dotSpecs={dotSpecs}
              dotRefs={dotRefs}
              revealDelaySec={0.12 + trackIndex * 0.06}
              revealDurationSec={0.45}
            />
            {/* Straight continuation past the most recent entry. */}
            <div
              className="absolute"
              style={{
                left: lastLeft,
                right: padRight,
                top: 0,
                height: 2,
                transform: 'translateY(-50%)',
                backgroundImage: `radial-gradient(circle, ${dottedColor} 1.1px, transparent 1.3px)`,
                backgroundSize: '8px 2px',
                backgroundRepeat: 'repeat-x',
                backgroundPosition: 'left center',
              }}
            />
          </div>
        );
      })}

      {entries.map((entry, index) => {
        const left = `calc(${rangeStartX}px + (${entry.railX} * (100% - ${rangeStartX + padRight}px)))`;
        const top = entry.type === 'education' ? `calc(50% - ${trackGap / 2}px)` : `calc(50% + ${trackGap / 2}px)`;
        const key = `${entry.title}-${entry.start}`;
        return (
          <div
            key={`${key}-button`}
            ref={(el) => {
              if (el) dotRefs.current.set(key, el);
              else dotRefs.current.delete(key);
            }}
              className="absolute"
              style={{
                left,
                top,
                transform: 'translate(-50%, calc(-50% + var(--wave-y, 0px)))',
              willChange: 'transform',
            }}
          >
            <button
              type="button"
              onClick={() => onJump(index)}
              aria-label={`Jump to ${entry.title}, ${entry.start}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ outlineColor: TRACK_COLORS[entry.type] }}
            >
              <span
                className="block h-2.5 w-2.5 rounded-full border-[1.5px]"
                style={{
                  background: index <= activeIndex ? TRACK_COLORS[entry.type] : 'var(--paper-base, #f4eee2)',
                  borderColor: index <= activeIndex ? TRACK_COLORS[entry.type] : 'var(--ink-muted, #6b625a)',
                }}
              />
              <span className="sr-only">{entry.title}</span>
            </button>
            <p className={styles.mobileYearLabel}>{entry.start.slice(0, 4)}</p>
          </div>
        );
      })}
    </div>
  );
}

export function MobileStack({ entries, reducedMotion }: { entries: TimelineEntry[]; reducedMotion: boolean }) {
  const model = useMemo(() => buildTimelineModel(entries), [entries]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDesktopHint, setShowDesktopHint] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    try {
      setShowDesktopHint(window.sessionStorage.getItem('tl-mobile-hint-dismissed') !== 'true');
    } catch {
      setShowDesktopHint(true);
    }
  }, []);

  const dismissDesktopHint = () => {
    setShowDesktopHint(false);
    try {
      window.sessionStorage.setItem('tl-mobile-hint-dismissed', 'true');
    } catch {
      // Ignore storage failures; the hint will simply reappear next load.
    }
  };

  const jumpToIndex = (index: number) => {
    const target = cardRefs.current[index];
    if (!target) return;

    const navHeightVar = getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim();
    const navHeight = Number.parseFloat(navHeightVar) || 88;
    const top = window.scrollY + target.getBoundingClientRect().top - getMobileJumpOffset(navHeight);

    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  useSwipeNav({
    enabled: true,
    containerRef: rootRef,
    activeIndex,
    count: model.entries.length,
    onJump: jumpToIndex,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const nextIndex = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(nextIndex)) setActiveIndex(nextIndex);
      },
      { threshold: [0.35, 0.6, 0.85] }
    );

    cardRefs.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [model.entries.length]);

  return (
    <div ref={rootRef} data-timeline-root="true" className={`${styles.mobileRoot} pt-[var(--nav-h,88px)]`}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {model.entries[activeIndex] ? `Now viewing ${model.entries[activeIndex].title}.` : 'Timeline ready.'}
      </div>

      {showDesktopHint && (
        <div className={styles.mobileHintBanner}>
          <p>{MOBILE_DESKTOP_HINT}</p>
          <button type="button" onClick={dismissDesktopHint} className={styles.mobileHintDismiss} aria-label="Dismiss desktop viewing hint">
            ×
          </button>
        </div>
      )}

      <section className={styles.mobileIntroSection}>
        <div className={styles.mobileIntroOverlay}>
          <div className={styles.mobileIntroWrap}>
            <p className={styles.introKicker}>Experience Atlas</p>
            <h1 className={styles.mobileIntroTitle}>A chronology of my academic and professional journey.</h1>
            <p className={styles.mobileIntroDeck}>
              Scroll to move through each chapter.
            </p>
          </div>
        </div>
      </section>

      <div className={`${styles.mobileSticky} sticky top-[var(--nav-h,88px)] z-20 border-b px-4 py-4 backdrop-blur`}>
        <p className={`${styles.mobileLabel} mb-2`}>Career timeline</p>
        <div className="h-[92px]">
          <CompactRail entries={model.entries} activeIndex={activeIndex} onJump={jumpToIndex} reducedMotion={reducedMotion} />
        </div>
      </div>

      <div>
        {model.entries.map((entry, index) => (
          <section
            key={`${entry.title}-${entry.start}`}
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
            data-index={index}
            className={`${styles.mobileEntrySection} border-b px-4 py-8`}
            style={{ minHeight: 'calc(100svh - var(--nav-h,88px) - 124px)' }}
          >
            <InlineEntry
              entry={entry}
              isActive={activeIndex === index}
              compactMobile
              sidebarSlot={
                entry.cityKey ? (
                  <CityMinimap cityKey={entry.cityKey} reducedMotion={reducedMotion} fixedSize={{ width: '100%', height: 'min(42svh, 260px)' }} />
                ) : null
              }
            />
          </section>
        ))}
      </div>
    </div>
  );
}
