// src/components/portfolio/map/UILayer.tsx
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import {
  MC, ANIM, CHAPTERS, CHAPTER_THRESHOLDS,
  DETAIL_IDS, OVERVIEW_IDS, PINS,
  SATELLITE_IMAGES,
} from './constants';
import type { Chapter, TimelineEntry } from './types';

// ── Helper ───────────────────────────────────────────────────────────────────
function formatDate(d?: string) {
  if (!d) return 'Present';
  const [y, m] = d.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + y;
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({
  scrollYProgress,
  chapterIndex,
}: {
  scrollYProgress: MotionValue<number>;
  chapterIndex: number;
}) {
  const isAu = CHAPTERS[chapterIndex]?.city === 'adelaide';
  const start = CHAPTER_THRESHOLDS[chapterIndex]     ?? 0;
  const end   = CHAPTER_THRESHOLDS[chapterIndex + 1] ?? 1;
  const width = useTransform(scrollYProgress, [start, end], ['0%', '100%']);

  return (
    <motion.div
      className="absolute top-0 left-0 z-30"
      style={{
        height: 2,
        width,
        background: isAu
          ? `linear-gradient(to right, ${MC.parchment}, #e8a068)`
          : `linear-gradient(to right, ${MC.cyan}, ${MC.pin})`,
      }}
    />
  );
}

// ── City label ───────────────────────────────────────────────────────────────
function CityLabel({ chapter }: { chapter: Chapter }) {
  const lbl = chapter.label;
  if (!lbl) return null;
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-20 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={chapter.id}
          initial={ANIM.hidden}
          animate={ANIM.fadeInUp}
          exit={ANIM.exit}
          transition={ANIM.smooth}
          style={{ whiteSpace: 'nowrap' }}
          aria-live="polite"
          aria-atomic="true"
        >
          <p style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(1.5rem, 3.8vw, 3rem)',
            color: lbl.accent ? MC.pin : MC.ink,
            letterSpacing: '-0.025em',
            lineHeight: 1,
            marginBottom: 6,
            fontWeight: 400,
            textShadow: '0 2px 20px rgba(0,0,0,0.7)',
          }}>
            {lbl.top}
          </p>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6rem',
            color: MC.ink_dim,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            {lbl.sub}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Scroll indicator ─────────────────────────────────────────────────────────
function ScrollIndicator({ chapter }: { chapter: Chapter }) {
  const hide = chapter.id === 'germany-all-pins';
  return (
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-20"
      animate={{ opacity: hide ? 0 : 0.5 }}
      transition={{ duration: 0.7 }}
    >
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'white',
        fontSize: '8px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}>
        scroll
      </p>
      <motion.div
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 1,
          height: 20,
          background: 'rgba(255,255,255,0.35)',
          willChange: 'transform',
        }}
      />
    </motion.div>
  );
}

// ── Detail card ──────────────────────────────────────────────────────────────
function DetailCard({
  entry,
  index,
  isMobile,
}: {
  entry: TimelineEntry;
  index: number;
  isMobile: boolean;
}) {
  const cardW = isMobile ? 'min(280px, 82vw)' : 'min(360px, 38vw)';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: cardW,
        flexShrink: 0,
        background: 'rgba(8, 16, 26, 0.91)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(200,184,154,0.22)',
        borderLeft: `3px solid ${MC.parchment}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: isMobile ? '14px 16px 10px' : '18px 20px 12px',
        borderBottom: '1px solid rgba(200,184,154,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {entry.logo && (
              <div style={{
                flexShrink: 0,
                marginTop: 2,
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 6,
                padding: '3px 6px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <img
                  src={entry.logo}
                  alt=""
                  style={{
                    height: isMobile ? 20 : 26,
                    objectFit: 'contain',
                  }}
                />
              </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: isMobile ? 14 : 17,
              color: MC.ink,
              lineHeight: 1.25,
              fontWeight: 400,
              marginBottom: 4,
            }}>
              {entry.title}
            </p>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: isMobile ? 9 : 10.5,
              color: MC.parchment,
              opacity: 0.75,
              lineHeight: 1.4,
            }}>
              {entry.company ?? entry.institution}
            </p>
          </div>
        </div>
        {/* Date + location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: isMobile ? 8 : 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: isMobile ? 9 : 10, color: MC.cyan, letterSpacing: '0.03em' }}>
            {formatDate(entry.start)} – {formatDate(entry.end)}
          </span>
          {entry.location && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>·</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: isMobile ? 9 : 10, color: MC.ink_dim }}>
                {entry.location}
              </span>
            </>
          )}
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8.5,
            padding: '2px 7px',
            borderRadius: 99,
            background: entry.type === 'education' ? 'rgba(200,184,154,0.12)' : 'rgba(255,107,53,0.12)',
            color: entry.type === 'education' ? MC.parchment : MC.pin,
            border: `1px solid ${entry.type === 'education' ? 'rgba(200,184,154,0.2)' : 'rgba(255,107,53,0.2)'}`,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}>
            {entry.type === 'education' ? 'Education' : 'Professional'}
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 20px' }}>
        <div
          style={{ fontSize: isMobile ? 11 : 12.5, lineHeight: 1.7, color: 'rgba(232,240,239,0.72)', fontFamily: "Georgia, 'Times New Roman', serif" }}
          dangerouslySetInnerHTML={{ __html: entry.description }}
        />
        {entry.website && (
          <a
            href={entry.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: MC.cyan, textDecoration: 'none', opacity: 0.85 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Visit website
          </a>
        )}
        {entry.skills && entry.skills.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 7 }}>
              Skills
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {entry.skills.map(s => (
                <span key={s} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: isMobile ? 8.5 : 9.5, padding: '3px 9px', borderRadius: 99, background: 'rgba(0,188,212,0.1)', color: MC.cyan, border: '1px solid rgba(0,188,212,0.22)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Cards overlay ─────────────────────────────────────────────────────────────
function CardsOverlay({
  chapter,
  entries,
  isMobile,
}: {
  chapter: Chapter;
  entries: TimelineEntry[];
  isMobile: boolean;
}) {
  if (!DETAIL_IDS.has(chapter.id)) return null;
  const city = chapter.city;
  if (!city) return null;

  const pin = PINS.find(p => p.key === city);
  if (!pin) return null;

  const cityEntries = entries.filter(e =>
    e.lat !== undefined &&
    Math.abs(e.lat - pin.lat) < 0.15 &&
    Math.abs((e.lng ?? 0) - pin.lng) < 0.15
  );

  // Frankfurt placeholder when no timeline entry exists yet
  const displayEntries: TimelineEntry[] = cityEntries.length > 0 ? cityEntries : city === 'frankfurt' ? [{
    type: 'professional',
    start: '2026-01',
    title: 'Frankfurt',
    description: '<p>Coming soon — details to be added.</p>',
  }] : [];

  if (displayEntries.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`cards-${chapter.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute pointer-events-none"
        style={{
          right: isMobile ? 8 : 32,
          top: '50%',
          transform: 'translateY(-50%)',
          width: isMobile ? 'min(280px, 82vw)' : 'min(360px, 38vw)',
          maxHeight: '82vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          pointerEvents: 'auto',
          zIndex: 20,
          scrollbarWidth: 'thin',
          scrollbarColor: `rgba(200,184,154,0.3) transparent`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px 4px 0' }}>
          {displayEntries.map((entry, i) => (
            <DetailCard key={i} entry={entry} index={i} isMobile={isMobile} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Timeline strip ────────────────────────────────────────────────────────────
function TimelineStrip({
  chapter,
  chapterIndex,
  isMobile,
}: {
  chapter: Chapter;
  chapterIndex: number;
  isMobile: boolean;
}) {
  const show = OVERVIEW_IDS.has(chapter.id);

  // ── Mobile: horizontal chip bar along the bottom ──────────────────────────
  if (isMobile) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            key="timeline-strip-mobile"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={ANIM.smooth}
            className="absolute z-20"
            style={{
              bottom: 48, // above scroll indicator
              left: 0,
              right: 0,
              paddingLeft: 12,
              paddingRight: 12,
            }}
          >
            <div style={{
              background: 'rgba(8, 16, 26, 0.82)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: `1px solid rgba(200,184,154,0.18)`,
              borderTop: `2px solid ${MC.parchment}`,
              borderRadius: 10,
              padding: '8px 4px',
              display: 'flex',
              flexDirection: 'row',
              overflowX: 'auto',
              gap: 4,
              scrollbarWidth: 'none',
              pointerEvents: 'auto',
            }}>
              {PINS.map((pin) => {
                const pinChapterIdx = CHAPTERS.findIndex(c => c.id === pin.appearsAt);
                const isDone = chapterIndex > pinChapterIdx;
                const isNext = chapterIndex === pinChapterIdx;
                return (
                  <div key={pin.key} style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 6,
                    background: isNext ? 'rgba(255,107,53,0.12)' : 'transparent',
                    border: isNext ? `1px solid rgba(255,107,53,0.3)` : '1px solid transparent',
                  }}>
                    {/* Dot */}
                    <div style={{ flexShrink: 0 }}>
                      {isDone ? (
                        <svg width="7" height="7" viewBox="0 0 10 10">
                          <circle cx="5" cy="5" r="4" fill={MC.parchment} />
                        </svg>
                      ) : isNext ? (
                        <div style={{ position: 'relative', width: 7, height: 7 }}>
                          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: MC.pin, animation: 'pm-pin-pulse 1.8s ease-out infinite' }} />
                          <svg width="7" height="7" viewBox="0 0 10 10" style={{ position: 'relative' }}>
                            <circle cx="5" cy="5" r="4" fill={MC.pin} />
                          </svg>
                        </div>
                      ) : (
                        <svg width="7" height="7" viewBox="0 0 10 10">
                          <circle cx="5" cy="5" r="3.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
                        </svg>
                      )}
                    </div>
                    {/* Label */}
                    <div>
                      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 11, color: isDone ? MC.parchment : isNext ? MC.ink : 'rgba(255,255,255,0.3)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                        {pin.label}
                      </p>
                      {pin.years && (
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: isDone ? MC.cyan : isNext ? MC.cyan : 'rgba(255,255,255,0.18)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          {pin.years}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Desktop: vertical panel top-right ────────────────────────────────────
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="timeline-strip"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={ANIM.smooth}
          className="absolute z-20"
          style={{
            right: 24,
            top: 'calc(var(--nav-h, 88px) + 16px)',
            width: 'clamp(160px, 22vw, 230px)',
          }}
        >
          <div style={{
            background: 'rgba(8, 16, 26, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid rgba(200,184,154,0.18)`,
            borderLeft: `2px solid ${MC.parchment}`,
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Sticky header */}
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.55rem',
              color: MC.parchment,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              padding: '16px 16px 12px',
              borderBottom: '1px solid rgba(200,184,154,0.1)',
              flexShrink: 0,
            }}>
              Career Path
            </p>
            {/* Scrollable list */}
            <div style={{
              overflowY: 'auto',
              maxHeight: 'clamp(180px, 40vh, 320px)',
              scrollbarWidth: 'thin',
              scrollbarColor: `rgba(200,184,154,0.3) transparent`,
              pointerEvents: 'auto',
            }}>
              {PINS.map((pin, i) => {
                const pinChapterIdx = CHAPTERS.findIndex(c => c.id === pin.appearsAt);
                const isDone  = chapterIndex > pinChapterIdx;
                const isNext  = chapterIndex === pinChapterIdx;
                return (
                  <div key={pin.key} style={{
                    padding: '10px 16px',
                    borderBottom: i < PINS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: isNext ? 'rgba(255,107,53,0.07)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ paddingTop: 3, flexShrink: 0 }}>
                        {isDone ? (
                          <svg width="10" height="10" viewBox="0 0 10 10">
                            <circle cx="5" cy="5" r="4" fill={MC.parchment} />
                          </svg>
                        ) : isNext ? (
                          <div style={{ position: 'relative', width: 10, height: 10 }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: MC.pin, animation: 'pm-pin-pulse 1.8s ease-out infinite' }} />
                            <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'relative' }}>
                              <circle cx="5" cy="5" r="4" fill={MC.pin} />
                            </svg>
                          </div>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 10 10">
                            <circle cx="5" cy="5" r="3.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
                          </svg>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 13, color: isDone ? MC.parchment : isNext ? MC.ink : 'rgba(255,255,255,0.35)', lineHeight: 1.2, marginBottom: 2 }}>
                          {pin.label}
                        </p>
                        {pin.years && (
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: isDone ? MC.cyan : isNext ? MC.cyan : 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', marginBottom: 2 }}>
                            {pin.years}
                          </p>
                        )}
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: isDone ? 'rgba(200,184,154,0.6)' : isNext ? MC.ink_dim : 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
                          {pin.country}
                        </p>
                        {pin.detail && (
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: isDone ? 'rgba(200,184,154,0.45)' : isNext ? 'rgba(232,240,239,0.5)' : 'rgba(255,255,255,0.15)', letterSpacing: '0.03em', marginTop: 2 }}>
                            {pin.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── UILayer export ────────────────────────────────────────────────────────────
export function UILayer({
  chapter,
  chapterIndex,
  scrollYProgress,
  entries,
  isMobile,
}: {
  chapter: Chapter;
  chapterIndex: number;
  scrollYProgress: MotionValue<number>;
  entries: TimelineEntry[];
  isMobile: boolean;
}) {
  return (
    <>
      <ProgressBar scrollYProgress={scrollYProgress} chapterIndex={chapterIndex} />
      <CityLabel chapter={chapter} />
      <TimelineStrip chapter={chapter} chapterIndex={chapterIndex} isMobile={isMobile} />
      <CardsOverlay chapter={chapter} entries={entries} isMobile={isMobile} />
      <ScrollIndicator chapter={chapter} />
    </>
  );
}
