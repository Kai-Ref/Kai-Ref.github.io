// src/components/portfolio/MapTimeline.tsx
import { useRef, useEffect, useState } from 'react';
import { useScroll, motion, AnimatePresence, useTransform } from 'framer-motion';
import * as d3 from 'd3';

// ─── Fonts (loaded via @import in global CSS; declare here for reference) ─────
// DM Serif Display — headings
// IBM Plex Mono   — metadata / monospace

interface TimelineEntry {
  type: 'education' | 'professional';
  start: string;
  end?: string;
  title: string;
  institution?: string;
  company?: string;
  location?: string;
  lat?: number;
  lng?: number;
  description: string;
  skills?: string[];
  logo?: string;
  website?: string;
}

// ─── Layout constants ──────────────────────────────────────────────────────────
const TOTAL_SVH       = 400;
const MOBILE_BP       = 640; // px — compact card layout below this

// ─── Atlas colour palette ──────────────────────────────────────────────────────
const MC = {
  ocean:         '#0d2238',   // deep prussian blue — sea
  land:          '#d4c5a4',   // warm parchment — world land base
  germany:       '#8faa7c',   // sage green — Germany highlight
  germany_hover: '#a3bf8d',
  germany_state: '#6e8d5d',   // darker state lines
  australia:     '#c4845a',   // terracotta — outback
  australia_hover:'#d4956d',
  australia_st:  '#a86840',   // state border
  river:         '#6ba3c2',   // glacial blue
  lake:          '#4a8fa8',
  graticule:     'rgba(255,255,255,0.055)',
  pin:           '#ff6b35',   // burnt orange pin
  pin_pulse:     'rgba(255,107,53,0.35)',
  parchment:     '#c8b89a',   // warm accent
  ink:           '#e8f0ef',   // near-white text
  ink_dim:       'rgba(232,240,239,0.45)',
  cyan:          '#00bcd4',
} as const;

// ─── Chapter system ────────────────────────────────────────────────────────────
const CHAPTER_BOUNDS = [
  { start: 0.00, end: 0.08 }, // 0: Germany overview, no pins
  { start: 0.08, end: 0.20 }, // 1: Zoom Karlsruhe
  { start: 0.20, end: 0.28 }, // 2: Pull back — KA pin stays
  { start: 0.28, end: 0.40 }, // 3: Zoom Mannheim
  { start: 0.40, end: 0.48 }, // 4: Pull back — KA+MA pins stay
  { start: 0.48, end: 0.60 }, // 5: Zoom Darmstadt
  { start: 0.60, end: 0.72 }, // 6: World zoom-out
  { start: 0.72, end: 0.88 }, // 7: Adelaide
  { start: 0.88, end: 1.00 }, // 8: Outro
];

const PROJECTION_CONFIGS = {
  germany_overview: {
    getScale: (w: number, h: number) => Math.min(w, h) * 3.5,
    center: [10.45, 51.16] as [number, number],
    geoDataset: 'germany' as const,
  },
  germany_karlsruhe: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.36, 49.0069] as [number, number],
    geoDataset: 'germany' as const,
  },
  germany_mannheim: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.42, 49.4875] as [number, number],
    geoDataset: 'germany' as const,
  },
  germany_darmstadt: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.61, 49.8728] as [number, number],
    geoDataset: 'germany' as const,
  },
  world: {
    getScale: (w: number, h: number) => Math.min(w, h) * 0.18,
    center: [20.0, 20.0] as [number, number],
    geoDataset: 'world' as const,
  },
  australia: {
    getScale: (w: number, h: number) => Math.min(w, h) * 1.2,
    center: [134.0, -25.0] as [number, number],
    geoDataset: 'australia' as const,
  },
} as const;

type MapPhase = keyof typeof PROJECTION_CONFIGS;

function getMapPhase(ch: number): MapPhase {
  if (ch === 1) return 'germany_karlsruhe';
  if (ch === 3) return 'germany_mannheim';
  if (ch === 5) return 'germany_darmstadt';
  if (ch === 6) return 'world';
  if (ch >= 7)  return 'australia';
  return 'germany_overview';
}

// Which chapters show the timeline side panel
const OVERVIEW_CHAPTERS = new Set([0, 2, 4]);
// Which chapters show large detail cards
const DETAIL_CHAPTERS   = new Set([1, 3, 5, 7, 8]);

const LOCATION_PINS = [
  { key: 'karlsruhe', lat: 49.0069, lng: 8.4037,   chapterIndex: 1, phase: 'germany'   as const, satelliteImage: '/images/cities/karlsruhe.webp' },
  { key: 'mannheim',  lat: 49.4875, lng: 8.466,     chapterIndex: 3, phase: 'germany'   as const, satelliteImage: '/images/cities/mannheim.webp'  },
  { key: 'darmstadt', lat: 49.8728, lng: 8.6512,    chapterIndex: 5, phase: 'germany'   as const, satelliteImage: '/images/cities/darmstadt.webp' },
  { key: 'adelaide',  lat: -34.9285, lng: 138.6007, chapterIndex: 7, phase: 'australia' as const, satelliteImage: '/images/cities/adelaide.webp'  },
];

// Returns the active location pin for a given chapter number
function getActivePinForChapter(chapter: number) {
  return LOCATION_PINS.find(pin => {
    if (pin.phase === 'germany') return chapter === pin.chapterIndex;
    return pin.phase === 'australia' && chapter >= pin.chapterIndex;
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d?: string) {
  if (!d) return 'Present';
  const [y, m] = d.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + y;
}

// ─── Chapter label ─────────────────────────────────────────────────────────────
const CHAPTER_LABELS: Record<number, { top: string; sub: string; accent?: boolean }> = {
  0: { top: 'Germany',   sub: 'scroll to explore' },
  1: { top: 'Karlsruhe', sub: 'Baden-Württemberg' },
  2: { top: 'Mannheim',  sub: 'next stop ↓',         accent: true },
  3: { top: 'Mannheim',  sub: 'Baden-Württemberg' },
  4: { top: 'Darmstadt', sub: 'next stop ↓',         accent: true },
  5: { top: 'Darmstadt', sub: 'Hessen, Germany' },
  6: { top: 'Departing', sub: 'Europe → Australia',   accent: true },
  7: { top: 'Adelaide',  sub: 'South Australia' },
  8: { top: 'Adelaide',  sub: 'South Australia' },
};

function ChapterLabel({ chapter }: { chapter: number }) {
  const lbl = CHAPTER_LABELS[chapter];
  if (!lbl) return null;
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-20 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={chapter}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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

// ─── Timeline side panel (overview chapters) ───────────────────────────────────
interface TimelineStop {
  key: string;
  city: string;
  country: string;
  chapterIndex: number;
  entries: TimelineEntry[];
}

function TimelineStrip({
  chapter,
  stops,
}: {
  chapter: number;
  stops: TimelineStop[];
}) {
  // Determine which stop is "next" vs done vs future
  // Current zoomed chapter tells us how far we've progressed
  const progressedChapter = chapter; // overview chapter index

  return (
    <AnimatePresence>
      {OVERVIEW_CHAPTERS.has(chapter) && (
        <motion.div
          key="timeline-strip"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="absolute z-20 pointer-events-none"
          style={{
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
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
            padding: '16px 0',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.55rem',
              color: MC.parchment,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              padding: '0 16px 12px',
              borderBottom: '1px solid rgba(200,184,154,0.1)',
              marginBottom: 4,
            }}>
              Career Path
            </p>

            {stops.map((stop, i) => {
              const isDone = stop.chapterIndex < progressedChapter;
              const isNext = !isDone && (
                // next = lowest chapterIndex not yet done
                i === stops.findIndex(s => s.chapterIndex >= progressedChapter)
              );
              const isFuture = !isDone && !isNext;

              return (
                <div
                  key={stop.key}
                  style={{
                    padding: '10px 16px',
                    borderBottom: i < stops.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: isNext ? 'rgba(255,107,53,0.07)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Dot */}
                    <div style={{ paddingTop: 3, flexShrink: 0 }}>
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <circle cx="5" cy="5" r="4" fill={MC.parchment} />
                        </svg>
                      ) : isNext ? (
                        <div style={{ position: 'relative', width: 10, height: 10 }}>
                          <div style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            background: MC.pin,
                            animation: 'pulse-ring 1.8s ease-out infinite',
                          }} />
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
                      <p style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: 13,
                        color: isDone ? MC.parchment : isNext ? MC.ink : 'rgba(255,255,255,0.35)',
                        lineHeight: 1.2,
                        marginBottom: 2,
                      }}>
                        {stop.city}
                      </p>
                      <p style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 8.5,
                        color: isDone ? 'rgba(200,184,154,0.6)' : isNext ? MC.ink_dim : 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.04em',
                        marginBottom: 2,
                      }}>
                        {stop.country}
                      </p>
                      {stop.entries.length > 0 && (
                        <p style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 8,
                          color: isDone || isNext ? MC.cyan : 'rgba(0,188,212,0.3)',
                        }}>
                          {formatDate(stop.entries[0].start)} – {formatDate(stop.entries[stop.entries.length - 1].end)}
                        </p>
                      )}
                    </div>
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

// ─── Large detail card ─────────────────────────────────────────────────────────
interface DetailCardProps {
  entry: TimelineEntry;
  index: number;
  isMobile: boolean;
}

function DetailCard({ entry, index, isMobile }: DetailCardProps) {
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
      {/* Card header */}
      <div style={{
        padding: isMobile ? '14px 16px 10px' : '18px 20px 12px',
        borderBottom: '1px solid rgba(200,184,154,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {entry.logo && (
            <img
              src={entry.logo}
              alt=""
              style={{
                height: isMobile ? 24 : 30,
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
                opacity: 0.85,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
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

        {/* Date + location row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: isMobile ? 8 : 10,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: isMobile ? 9 : 10,
            color: MC.cyan,
            letterSpacing: '0.03em',
          }}>
            {formatDate(entry.start)} – {formatDate(entry.end)}
          </span>
          {entry.location && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>·</span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: isMobile ? 9 : 10,
                color: MC.ink_dim,
              }}>
                {entry.location}
              </span>
            </>
          )}
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8.5,
            padding: '2px 7px',
            borderRadius: 99,
            background: entry.type === 'education'
              ? 'rgba(200,184,154,0.12)'
              : 'rgba(255,107,53,0.12)',
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
          style={{
            fontSize: isMobile ? 11 : 12.5,
            lineHeight: 1.7,
            color: 'rgba(232,240,239,0.72)',
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
          dangerouslySetInnerHTML={{ __html: entry.description }}
        />

        {/* Website */}
        {entry.website && (
          <a
            href={entry.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: MC.cyan,
              textDecoration: 'none',
              opacity: 0.85,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Visit website
          </a>
        )}

        {/* Skills */}
        {entry.skills && entry.skills.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 7,
            }}>
              Skills
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {entry.skills.map(s => (
                <span key={s} style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: isMobile ? 8.5 : 9.5,
                  padding: '3px 9px',
                  borderRadius: 99,
                  background: 'rgba(0,188,212,0.1)',
                  color: MC.cyan,
                  border: '1px solid rgba(0,188,212,0.22)',
                }}>
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

// ─── Satellite image backdrop ──────────────────────────────────────────────────
function SatelliteBackdrop({ chapter }: { chapter: number }) {
  const isDetail = DETAIL_CHAPTERS.has(chapter);

  // Find the active pin for this chapter
  const activePin = getActivePinForChapter(chapter);

  const imageSrc = isDetail && activePin ? activePin.satelliteImage : null;

  return (
    <AnimatePresence>
      {imageSrc && (
        <motion.img
          key={imageSrc}
          src={imageSrc}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeIn' }}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            zIndex: 0,
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Cards overlay ─────────────────────────────────────────────────────────────
interface ProjectedGroup {
  key: string;
  x: number;
  y: number;
  entries: TimelineEntry[];
  chapterIndex: number;
  phase: 'germany' | 'australia';
}

function CardsOverlay({
  chapter,
  projectedGroups,
  svgW,
  svgH,
  isMobile,
}: {
  chapter: number;
  projectedGroups: ProjectedGroup[];
  svgW: number;
  svgH: number;
  isMobile: boolean;
}) {
  if (!DETAIL_CHAPTERS.has(chapter)) return null;

  // Find the group active in this chapter
  const activePin = getActivePinForChapter(chapter);
  const activeGroup = projectedGroups.find(g => g.key === activePin?.key);

  if (!activeGroup || activeGroup.entries.length === 0) return null;

  // Position: right-side by default, flip if pin is in right half
  const pinIsRight = activeGroup.x > svgW * 0.55;
  const CARD_W_PX  = isMobile ? 280 : 370;
  const PIN_GAP    = isMobile ? 20 : 36;
  const leftPos = pinIsRight
    ? activeGroup.x - CARD_W_PX - PIN_GAP
    : activeGroup.x + PIN_GAP;

  // Clamp to viewport
  const clampedLeft = Math.max(8, Math.min(leftPos, svgW - CARD_W_PX - 8));

  // Vertical: centre on pin, clamp
  const stackH  = Math.min(svgH * 0.82, svgH - 80);
  const topPos  = Math.max(24, Math.min(activeGroup.y - stackH / 2, svgH - stackH - 24));

  return (
    <AnimatePresence>
      <motion.div
        key={`cards-${chapter}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute pointer-events-none"
        style={{
          left: clampedLeft,
          top: topPos,
          width: CARD_W_PX,
          maxHeight: stackH,
          overflowY: 'auto',
          overflowX: 'hidden',
          pointerEvents: 'auto',
          // custom scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: `rgba(200,184,154,0.3) transparent`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px 4px 0' }}>
          {activeGroup.entries.map((entry, i) => (
            <DetailCard key={`${activeGroup.key}-${i}`} entry={entry} index={i} isMobile={isMobile} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function MapTimeline() {
  const [entries,      setEntries]      = useState<TimelineEntry[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [svgSize,      setSvgSize]      = useState({ w: 0, h: 0 });

  // GeoJSON datasets
  const [germanyGeo,   setGermanyGeo]   = useState<any>(null);
  const [worldGeo,     setWorldGeo]     = useState<any>(null);
  const [australiaGeo, setAustraliaGeo] = useState<any>(null);
  const [oceanGeo,     setOceanGeo]     = useState<any>(null);
  const [landGeo,      setLandGeo]      = useState<any>(null);
  const [riversGeo,    setRiversGeo]    = useState<any>(null);
  const [lakesGeo,     setLakesGeo]     = useState<any>(null);

  const [projectedGroups, setProjectedGroups] = useState<ProjectedGroup[]>([]);

  const outerRef = useRef<HTMLDivElement>(null);
  const svgRef   = useRef<SVGSVGElement>(null);

  // For interpolated zoom transition
  const prevPhaseRef   = useRef<MapPhase | null>(null);
  const tweenRef       = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  });

  const currentBound  = CHAPTER_BOUNDS[Math.min(currentChapter, CHAPTER_BOUNDS.length - 1)];
  const chapterProgress = useTransform(
    scrollYProgress,
    [currentBound.start, currentBound.end],
    ['0%', '100%']
  );

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/timeline.json')
      .then(r => r.json())
      .then((d: TimelineEntry[]) => setEntries(d))
      .catch(e => console.error('timeline.json', e));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/geo/germany.geojson').then(r => r.json()),
      fetch('/geo/world.geojson').then(r => r.json()),
      fetch('/geo/australia.geojson').then(r => r.json()),
      fetch('/geo/ne_110m_ocean.geojson').then(r => r.json()),
      fetch('/geo/ne_110m_land.geojson').then(r => r.json()),
      fetch('/geo/ne_110m_rivers_lake_centerlines.geojson').then(r => r.json()),
      fetch('/geo/ne_110m_lakes.geojson').then(r => r.json()),
    ]).then(([germany, world, australia, ocean, land, rivers, lakes]) => {
      setGermanyGeo(germany);
      setWorldGeo(world);
      setAustraliaGeo(australia);
      setOceanGeo(ocean);
      setLandGeo(land);
      setRiversGeo(rivers);
      setLakesGeo(lakes);
    }).catch(e => console.error('GeoJSON load error', e));
  }, []);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    return scrollYProgress.on('change', (p) => {
      const ch = CHAPTER_BOUNDS.findIndex(b => p >= b.start && p < b.end);
      setCurrentChapter(ch === -1 ? CHAPTER_BOUNDS.length - 1 : ch);
    });
  }, [scrollYProgress]);

  // ── SVG resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const parent = svgRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSvgSize({ w: width, h: height });
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // ── D3 map rendering ──────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const { w, h } = svgSize;
    if (!svg || w === 0 || h === 0) return;
    if (!germanyGeo || !worldGeo || !australiaGeo) return;

    const phase  = getMapPhase(currentChapter);
    const config = PROJECTION_CONFIGS[phase];
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    const svgSel = d3.select(svg);

    // ── Ensure layer groups (bottom → top) ──────────────────────────────────
    const ensureGroup = (cls: string, insertBefore?: string) => {
      let g = svgSel.select<SVGGElement>(`g.${cls}`);
      if (g.empty()) {
        if (insertBefore) {
          const before = svgSel.select(`g.${insertBefore}`);
          if (!before.empty()) {
            g = before.insert('g', ':first-child').attr('class', cls) as any;
          } else {
            g = svgSel.append('g').attr('class', cls);
          }
        } else {
          g = svgSel.append('g').attr('class', cls);
        }
      }
      return g;
    };

    const oceanGroup    = ensureGroup('ocean-group');
    const landGroup     = ensureGroup('land-group');
    const lakesGroup    = ensureGroup('lakes-group');
    const riversGroup   = ensureGroup('rivers-group');
    const mapGroup      = ensureGroup('map-group');
    const gratGroup     = ensureGroup('graticule-group');
    const pinsGroup     = svgSel.select<SVGGElement>('g.map-pins-group').empty()
      ? svgSel.append('g').attr('class', 'map-pins-group')
      : svgSel.select<SVGGElement>('g.map-pins-group');

    // ── Build start/end projection for tween ──────────────────────────────
    const targetScale  = config.getScale(w, h);
    const targetCenter = config.center;

    let startScale  = targetScale;
    let startCenter = targetCenter;
    if (prevPhase && prevPhase !== phase) {
      const prev = PROJECTION_CONFIGS[prevPhase];
      startScale  = prev.getScale(w, h);
      startCenter = prev.center;
    }

    // ── Projection factory ─────────────────────────────────────────────────
    const makeProjection = (scale: number, center: [number, number]) =>
      d3.geoMercator().scale(scale).center(center).translate([w / 2, h / 2]);

    // ── Render a single frame ──────────────────────────────────────────────
    const renderFrame = (scale: number, center: [number, number], isFirstFrame: boolean, isDetailChapter: boolean) => {
      const proj    = makeProjection(scale, center);
      const pathGen = d3.geoPath().projection(proj);

      // Ocean background rect
      oceanGroup.selectAll('rect.ocean-rect').data([null])
        .join('rect')
        .attr('class', 'ocean-rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', w).attr('height', h)
        .attr('fill', MC.ocean);

      // Natural Earth land
      if (landGeo) {
        landGroup.selectAll<SVGPathElement, any>('path.ne-land')
          .data(landGeo.features, (d: any) => `nel:${d.properties?.featurecla}:${landGeo.features.indexOf(d)}`)
          .join('path')
          .attr('class', 'ne-land')
          .attr('fill', MC.land)
          .attr('stroke', 'rgba(0,0,0,0.15)')
          .attr('stroke-width', 0.4)
          .attr('d', (d: any) => pathGen(d) ?? '');
      }

      // Natural Earth lakes
      if (lakesGeo) {
        lakesGroup.selectAll<SVGPathElement, any>('path.ne-lake')
          .data(lakesGeo.features, (_: any, i: number) => `lk:${i}`)
          .join('path')
          .attr('class', 'ne-lake')
          .attr('fill', MC.lake)
          .attr('stroke', 'none')
          .attr('d', (d: any) => pathGen(d) ?? '');
      }

      // Natural Earth rivers
      if (riversGeo) {
        riversGroup.selectAll<SVGPathElement, any>('path.ne-river')
          .data(riversGeo.features, (_: any, i: number) => `rv:${i}`)
          .join('path')
          .attr('class', 'ne-river')
          .attr('fill', 'none')
          .attr('stroke', MC.river)
          .attr('stroke-width', (d: any) => {
            const sr = d.properties?.scalerank ?? 5;
            return sr <= 3 ? 0.9 : sr <= 5 ? 0.6 : 0.35;
          })
          .attr('d', (d: any) => pathGen(d) ?? '');
      }

      // Feature outlines (germany / australia / world)
      let geoData: any = null;
      if      (config.geoDataset === 'germany')   geoData = germanyGeo;
      else if (config.geoDataset === 'world')      geoData = worldGeo;
      else                                          geoData = australiaGeo ?? worldGeo;
      if (!geoData) return;

      const features = geoData.type === 'FeatureCollection' ? geoData.features : [geoData];

      const fillFn = (d: any): string => {
        if (config.geoDataset === 'germany')   return MC.germany;
        if (config.geoDataset === 'australia') return MC.australia;
        // world — highlight germany and australia
        const n = d.properties?.name ?? '';
        if (n === 'Germany')   return MC.germany;
        if (n === 'Australia') return MC.australia;
        return MC.land;
      };
      const strokeFn = (d: any): string => {
        if (config.geoDataset === 'germany')   return MC.germany_state;
        if (config.geoDataset === 'australia') return MC.australia_st;
        return 'rgba(0,0,0,0.25)';
      };

      const paths = mapGroup
        .selectAll<SVGPathElement, any>('path.geo-feature')
        .data(features, (d: any) => {
          if (d.properties?.STATE_NAME) return `au:${d.properties.STATE_NAME}`;
          if (d.properties?.name)       return `w:${d.properties.name}`;
          return `g:${String(d.id ?? 0)}`;
        });

      // Enter
      const entered = paths.enter()
        .append('path')
        .attr('class', 'geo-feature')
        .attr('fill', fillFn)
        .attr('stroke', strokeFn)
        .attr('stroke-width', config.geoDataset === 'world' ? 0.5 : 0.9)
        .attr('opacity', isFirstFrame ? 0 : 1)
        .attr('d', (d: any) => pathGen(d) ?? '')
        .on('mouseover', function(_, d) {
          const ds = config.geoDataset;
          d3.select(this).attr('fill',
            ds === 'germany' ? MC.germany_hover :
            ds === 'australia' ? MC.australia_hover :
            fillFn(d) === MC.germany ? MC.germany_hover :
            fillFn(d) === MC.australia ? MC.australia_hover :
            MC.land
          );
        })
        .on('mouseout', function(_, d) {
          d3.select(this).attr('fill', fillFn(d));
        });

      if (isFirstFrame) {
        entered.transition().duration(500).attr('opacity', 1);
      }

      // Update
      paths
        .attr('fill', fillFn)
        .attr('stroke', strokeFn)
        .attr('d', (d: any) => pathGen(d) ?? '');

      // Exit
      paths.exit()
        .transition().duration(250)
        .attr('opacity', 0)
        .remove();

      // Hide all geographic layers when satellite backdrop is active
      const detailOpacity = isDetailChapter ? 0 : 1;
      const detailPointerEvents = isDetailChapter ? 'none' : 'all';
      landGroup.transition().duration(300).attr('opacity', detailOpacity);
      lakesGroup.transition().duration(300).attr('opacity', detailOpacity);
      riversGroup.transition().duration(300).attr('opacity', detailOpacity);
      mapGroup.transition().duration(300).attr('opacity', detailOpacity).style('pointer-events', detailPointerEvents);
      gratGroup.transition().duration(300).attr('opacity', detailOpacity);

      // Graticule
      const graticule = d3.geoGraticule().step([10, 10])();
      gratGroup.selectAll('path').remove();
      gratGroup.append('path')
        .datum(graticule)
        .attr('d', pathGen(graticule) ?? '')
        .attr('fill', 'none')
        .attr('stroke', MC.graticule)
        .attr('stroke-width', 0.5);
    };

    // ── Tween the projection ───────────────────────────────────────────────
    const DURATION = 680; // ms
    const ease = d3.easeCubicOut;

    if (prevPhase !== phase) {
      const start = performance.now();
      const scaleInterp  = d3.interpolateNumber(startScale, targetScale);
      const lngInterp    = d3.interpolateNumber(startCenter[0], targetCenter[0]);
      const latInterp    = d3.interpolateNumber(startCenter[1], targetCenter[1]);
      const targetIsDetail = DETAIL_CHAPTERS.has(currentChapter);

      let rafId: number;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const te = ease(t);
        renderFrame(scaleInterp(te), [lngInterp(te), latInterp(te)], t === 0, targetIsDetail);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    } else {
      renderFrame(targetScale, targetCenter, false, DETAIL_CHAPTERS.has(currentChapter));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [germanyGeo, worldGeo, australiaGeo, oceanGeo, landGeo, riversGeo, lakesGeo, svgSize, currentChapter]);

  // ── D3 pin rendering ──────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const { w, h } = svgSize;
    if (!svg || w === 0 || h === 0) return;

    const phase  = getMapPhase(currentChapter);
    const config = PROJECTION_CONFIGS[phase];
    const svgSel = d3.select(svg);

    let pinsGroup = svgSel.select<SVGGElement>('g.map-pins-group');
    if (pinsGroup.empty()) {
      pinsGroup = svgSel.append('g').attr('class', 'map-pins-group');
    }

    // Hide pins during world-zoom chapter
    pinsGroup.style('opacity', currentChapter === 6 ? '0' : '1');
    pinsGroup.style('transition', 'opacity 0.5s ease');

    const projection = d3.geoMercator()
      .scale(config.getScale(w, h))
      .center(config.center)
      .translate([w / 2, h / 2]);

    LOCATION_PINS.forEach(pin => {
      const pinPhaseMatch = phase.startsWith('germany') ? 'germany' : phase;
      if (pin.phase !== pinPhaseMatch) {
        // Remove pins from different phase
        pinsGroup.select(`g#pin-${pin.key}`).remove();
        return;
      }

      const active = currentChapter >= pin.chapterIndex;
      const pinId  = `pin-${pin.key}`;

      let pinGroup = pinsGroup.select<SVGGElement>(`g#${pinId}`);
      if (pinGroup.empty()) {
        pinGroup = pinsGroup.append('g').attr('id', pinId);
      }

      const proj = projection([pin.lng, pin.lat]);
      if (!proj) return;
      pinGroup.attr('transform', `translate(${proj[0]},${proj[1]})`);

      // Needle
      let needle = pinGroup.select<SVGLineElement>('line.pin-needle');
      if (needle.empty()) {
        needle = pinGroup.append('line').attr('class', 'pin-needle')
          .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 0)
          .attr('stroke', MC.parchment).attr('stroke-width', 1.5).attr('stroke-linecap', 'round');
      }
      needle.transition().duration(active ? 500 : 0).delay(active ? 150 : 0)
        .attr('y2', active ? -26 : 0);

      // Head
      let head = pinGroup.select<SVGCircleElement>('circle.pin-head');
      if (head.empty()) {
        head = pinGroup.append('circle').attr('class', 'pin-head')
          .attr('cx', 0).attr('cy', -26).attr('r', 0)
          .attr('fill', MC.pin)
          .attr('stroke', 'rgba(255,255,255,0.95)').attr('stroke-width', 1.5);
      }
      head.attr('cy', -26)
        .transition().duration(active ? 380 : 180).delay(active ? 480 : 0)
        .attr('r', active ? 5.5 : 0);

      // Pulse ring
      let pulse = pinGroup.select<SVGCircleElement>('circle.pin-pulse');
      if (pulse.empty()) {
        pulse = pinGroup.append('circle').attr('class', 'pin-pulse')
          .attr('cx', 0).attr('cy', -26).attr('r', 5.5)
          .attr('fill', 'none')
          .attr('stroke', MC.pin).attr('stroke-width', 1)
          .attr('opacity', 0);
      }
      pulse.attr('cy', -26)
        .transition().delay(active ? 860 : 0).duration(320)
        .attr('opacity', active ? 1 : 0);
    });
  }, [germanyGeo, worldGeo, australiaGeo, svgSize, currentChapter]);

  // ── Projected group positions ─────────────────────────────────────────────
  useEffect(() => {
    const { w, h } = svgSize;
    if (w === 0 || h === 0) return;

    const phase  = getMapPhase(currentChapter);
    const config = PROJECTION_CONFIGS[phase];
    const proj   = d3.geoMercator()
      .scale(config.getScale(w, h))
      .center(config.center)
      .translate([w / 2, h / 2]);

    setProjectedGroups(LOCATION_PINS.map(pin => {
      const p = proj([pin.lng, pin.lat]);
      return {
        key:   pin.key,
        x:     p ? p[0] : -9999,
        y:     p ? p[1] : -9999,
        entries: entries.filter(e =>
          e.lat !== undefined && e.lng !== undefined &&
          Math.abs(e.lat - pin.lat) < 0.1 && Math.abs(e.lng - pin.lng) < 0.1
        ),
        chapterIndex: pin.chapterIndex,
        phase: pin.phase,
      };
    }));
  }, [svgSize, currentChapter, entries, germanyGeo, worldGeo, australiaGeo]);

  // ── Timeline stops for side panel ─────────────────────────────────────────
  const timelineStops: TimelineStop[] = LOCATION_PINS.map(pin => ({
    key:          pin.key,
    city:         pin.key.charAt(0).toUpperCase() + pin.key.slice(1),
    country:      pin.phase === 'germany' ? 'Germany' : 'Australia',
    chapterIndex: pin.chapterIndex,
    entries:      entries.filter(e =>
      e.lat !== undefined && e.lng !== undefined &&
      Math.abs(e.lat - pin.lat) < 0.1 && Math.abs(e.lng - pin.lng) < 0.1
    ),
  }));

  const isMobile = svgSize.w < MOBILE_BP;

  return (
    <>
      {/* Inject keyframe for pulse ring animation + font imports + scrollbar */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          80%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        @keyframes pin-pulse-svg {
          0%   { r: 5.5; opacity: 0.8; }
          70%  { r: 13;  opacity: 0; }
          100% { r: 13;  opacity: 0; }
        }

        .pin-pulse {
          animation: pin-pulse-svg 2s ease-out infinite;
        }

        /* Webkit scrollbar for card stack */
        .card-scroll::-webkit-scrollbar { width: 4px; }
        .card-scroll::-webkit-scrollbar-track { background: transparent; }
        .card-scroll::-webkit-scrollbar-thumb { background: rgba(200,184,154,0.3); border-radius: 2px; }

        /* Achievement block styling inside card descriptions */
        .achievement {
          margin: 8px 0;
          padding-left: 12px;
          border-left: 2px solid rgba(200,184,154,0.35);
          font-size: 0.9em;
          color: rgba(232,240,239,0.6);
        }
      `}</style>

      <div ref={outerRef} style={{ height: `${TOTAL_SVH}svh` }} className="relative">
        {/* Sticky viewport */}
        <div
          role="region"
          aria-label="Interactive career map"
          className="sticky top-0 overflow-hidden"
          style={{
            height: '100svh',
            background: MC.ocean,
          }}
        >
          {/* Satellite aerial backdrop (detail chapters only) */}
          <SatelliteBackdrop chapter={currentChapter} />

          {/* D3 SVG map layer */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
            style={{ willChange: 'transform', position: 'relative', zIndex: 1 }}
          />

          {/* Vignette overlay (CSS box-shadow inset) */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              boxShadow: 'inset 0 0 120px 40px rgba(8,14,22,0.65)',
            }}
          />

          {/* Chapter progress bar */}
          <motion.div
            className="absolute top-0 left-0 z-30"
            style={{
              height: 2,
              width: chapterProgress,
              background: currentChapter >= 7
                ? `linear-gradient(to right, ${MC.australia}, #e8a068)`
                : `linear-gradient(to right, ${MC.cyan}, ${MC.pin})`,
            }}
          />

          {/* Chapter label */}
          <ChapterLabel chapter={currentChapter} />

          {/* Timeline side strip (overview chapters) */}
          <TimelineStrip chapter={currentChapter} stops={timelineStops} />

          {/* Detail cards overlay */}
          <CardsOverlay
            chapter={currentChapter}
            projectedGroups={projectedGroups}
            svgW={svgSize.w}
            svgH={svgSize.h}
            isMobile={isMobile}
          />

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-20"
            animate={{ opacity: currentChapter >= 7 ? 0 : 0.5 }}
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
              style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.35)', willChange: 'transform' }}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
}
