import { useRef } from 'react';
import { motion } from 'framer-motion';

import { RAIL_GEOMETRY, TRACK_COLORS } from './constants';
import styles from './styles.module.css';
import type { TimelineEntryView, TimelineEntry } from './types';
import { WavyRail, type WavyRailDotSpec } from './WavyRail';

function yearFromDate(dateStr: string) {
  return Number(dateStr.split('-')[0]);
}

function getTrackY(type: TimelineEntry['type']) {
  return type === 'education' ? 'upper' : 'lower';
}

function dotKey(entry: TimelineEntryView) {
  return `${entry.title}-${entry.start}`;
}

export function TimelineRail({
  entries,
  activeIndex,
  playheadX,
  introComplete,
  onJump,
  reducedMotion,
}: {
  entries: TimelineEntryView[];
  activeIndex: number | null;
  playheadX: number;
  introComplete: boolean;
  onJump: (index: number) => void;
  reducedMotion: boolean;
}) {
  // Single shared ref-map of dot wrapper elements; each WavyRail only
  // touches the keys in its own `dotSpecs` so no per-track filtering
  // is required here.
  const dotRefs = useRef<Map<string, HTMLElement>>(new Map());

  if (entries.length === 0) {
    return null;
  }

  const upperY = `calc(50% - ${RAIL_GEOMETRY.trackGap / 2}px)`;
  const lowerY = `calc(50% + ${RAIL_GEOMETRY.trackGap / 2}px)`;
  const playheadLeft = `calc(${RAIL_GEOMETRY.rangeStartX}px + (${playheadX} * (100% - ${RAIL_GEOMETRY.rangeStartX + RAIL_GEOMETRY.padRight}px)))`;

  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, delay: 0.22, ease: 'easeOut' }}
        className="absolute z-20"
        style={{
          left: RAIL_GEOMETRY.padLeft,
          width: RAIL_GEOMETRY.labelEndX - RAIL_GEOMETRY.padLeft,
          top: `calc(50% - ${RAIL_GEOMETRY.trackGap / 2}px)`,
          transform: 'translateY(-50%)',
          textAlign: 'right',
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 13,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--edu-color)',
          fontWeight: 600,
        }}
      >
        Education
      </motion.p>

      <motion.p
        initial={reducedMotion ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, delay: 0.26, ease: 'easeOut' }}
        className="absolute z-20"
        style={{
          left: RAIL_GEOMETRY.padLeft,
          width: RAIL_GEOMETRY.labelEndX - RAIL_GEOMETRY.padLeft,
          top: `calc(50% + ${RAIL_GEOMETRY.trackGap / 2}px)`,
          transform: 'translateY(-50%)',
          textAlign: 'right',
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 13,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--pro-color)',
          fontWeight: 600,
        }}
      >
        Professional
      </motion.p>

      {(['education', 'professional'] as const).map((track, index) => {
        const y = track === 'education' ? upperY : lowerY;
        const trackEntries = entries.filter((entry) => entry.type === track);
        const lastTrackX = trackEntries.length > 0
          ? Math.max(...trackEntries.map((entry) => entry.railX))
          : 0;
        const lastLeft = `calc(${RAIL_GEOMETRY.rangeStartX}px + (${lastTrackX} * (100% - ${RAIL_GEOMETRY.rangeStartX + RAIL_GEOMETRY.padRight}px)))`;
        const solidColor = `color-mix(in srgb, ${TRACK_COLORS[track]} 55%, var(--rule))`;
        const dottedColor = `color-mix(in srgb, ${TRACK_COLORS[track]} 65%, transparent)`;
        const captionColor = `color-mix(in srgb, ${TRACK_COLORS[track]} 78%, transparent)`;

        const dotSpecs: WavyRailDotSpec[] = trackEntries.map((entry) => ({
          key: dotKey(entry),
          xRatio: entry.railX,
        }));

        return (
          <div key={track} className="absolute" style={{ left: 0, right: 0, top: y, transform: 'translateY(-50%)' }}>
            <WavyRail
              rangeStartXPx={RAIL_GEOMETRY.rangeStartX}
              padRightPx={RAIL_GEOMETRY.padRight}
              lastEntryRatio={lastTrackX}
              color={solidColor}
              phaseSeed={index === 0 ? 1.7 : 4.3}
              amplitudePx={14}
              taperPx={110}
              canvasHeight={56}
              reducedMotion={reducedMotion}
              dotSpecs={dotSpecs}
              dotRefs={dotRefs}
              revealDelaySec={0.18 + index * 0.08}
              revealDurationSec={0.55}
            />
            <motion.div
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: reducedMotion ? 0 : 0.55, delay: 0.32 + index * 0.08, ease: 'easeOut' }}
              className="absolute"
              style={{
                left: lastLeft,
                right: RAIL_GEOMETRY.padRight,
                top: 0,
                height: 2,
                transform: 'translateY(-50%)',
                backgroundImage: `radial-gradient(circle, ${dottedColor} 1.1px, transparent 1.3px)`,
                backgroundSize: '8px 2px',
                backgroundRepeat: 'repeat-x',
                backgroundPosition: 'left center',
              }}
            />
            <motion.span
              initial={reducedMotion ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.4, delay: 0.5 + index * 0.08, ease: 'easeOut' }}
              className="absolute"
              style={{
                right: RAIL_GEOMETRY.padRight - 6,
                top: -16,
                fontFamily: "'Newsreader', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 13,
                color: captionColor,
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em',
              }}
            >
              ongoing →
            </motion.span>
          </div>
        );
      })}

      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1, left: playheadLeft }}
        transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
        className="absolute z-10"
        style={{
          top: `calc(50% - ${RAIL_GEOMETRY.trackGap / 2 + 18}px)`,
          height: RAIL_GEOMETRY.trackGap + 36,
          width: 2,
          transform: 'translateX(-50%)',
          background: activeIndex !== null ? TRACK_COLORS[entries[activeIndex].type] : 'var(--ink-muted)',
        }}
      />

      {entries.map((entry, index) => {
        const isPast = activeIndex !== null && index < activeIndex;
        const isActive = activeIndex === index;
        const fill = isPast || isActive ? TRACK_COLORS[entry.type] : 'var(--paper-base)';
        const stroke = isPast || isActive ? TRACK_COLORS[entry.type] : 'var(--ink-muted)';
        const left = `calc(${RAIL_GEOMETRY.rangeStartX}px + (${entry.railX} * (100% - ${RAIL_GEOMETRY.rangeStartX + RAIL_GEOMETRY.padRight}px)))`;
        const top = getTrackY(entry.type) === 'upper' ? upperY : lowerY;
        const key = dotKey(entry);

        return (
          <div
            key={key}
            ref={(el) => {
              if (el) dotRefs.current.set(key, el);
              else dotRefs.current.delete(key);
            }}
            className="absolute z-20"
            style={{
              left,
              top,
              transform: 'translate(-50%, calc(-50% + var(--wave-y, 0px)))',
              willChange: 'transform',
            }}
          >
            {isActive && introComplete && (
              <p
                className="absolute left-1/2 whitespace-nowrap text-center"
                style={{
                  bottom: 32,
                  transform: 'translateX(-50%)',
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontSize: 15,
                  letterSpacing: '-0.005em',
                  color: 'var(--ink-main)',
                  fontWeight: 500,
                }}
              >
                {entry.shortTitle}
              </p>
            )}

            <button
              type="button"
              onClick={() => onJump(index)}
              aria-label={`Jump to ${entry.title}, ${entry.start}`}
              className={`${styles.timelineDotButton} relative flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
              style={{ outlineColor: TRACK_COLORS[entry.type] }}
            >
              <span
                className="block h-[15px] w-[15px] rounded-full border-[2px]"
                style={{
                  background: fill,
                  borderColor: stroke,
                  boxShadow: isActive ? `0 0 0 9px color-mix(in srgb, ${TRACK_COLORS[entry.type]} 16%, transparent)` : 'none',
                }}
              />
            </button>

            <p
              className="absolute left-1/2 whitespace-nowrap text-center uppercase"
              style={{
                top: 30,
                transform: 'translateX(-50%)',
                fontSize: 10.5,
                letterSpacing: '0.22em',
                color: 'var(--ink-muted)',
              }}
            >
              {yearFromDate(entry.start)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
