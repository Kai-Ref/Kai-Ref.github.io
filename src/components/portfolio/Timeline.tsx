// src/components/portfolio/Timeline.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

interface TimelineEntry {
  type: 'education' | 'professional';
  start: string;
  end?: string;
  title: string;
  institution?: string;
  company?: string;
  location?: string;
  description: string;
  skills?: string[];
  logo?: string;
  website?: string;
}

interface PlacedItem {
  entry: TimelineEntry;
  finalTop: number;
  finalHeight: number;
  sideClass: 'left' | 'right';
  globalIndex: number;
  startDate: number;
  endDate: number;
}

const CONFIG = {
  minSpacing: 50,
  minBoxHeight: 80,
  monthHeight: 35,
  extraTimelinePadding: 300,
};

function dateToNumeric(dateStr: string): number {
  const [year, month] = dateStr.split('-').map(Number);
  return year + (month - 1) / 12;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Present';
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function adjustPositions(items: any[]): any[] {
  const adjusted: any[] = [];
  items.forEach((item) => {
    let top = item.idealTop;
    let height = item.idealHeight;
    adjusted.forEach((prev) => {
      const prevBottom = prev.finalTop + prev.finalHeight;
      if (top < prevBottom + CONFIG.minSpacing) {
        top = prevBottom + CONFIG.minSpacing;
        height = Math.max(CONFIG.minBoxHeight, item.idealHeight);
      }
    });
    adjusted.push({ ...item, finalTop: top, finalHeight: height, finalBottom: top + height });
  });
  return adjusted;
}

export default function Timeline() {
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [totalHeight, setTotalHeight] = useState(2000);
  const [yearMarkers, setYearMarkers] = useState<{ year: number; top: number; label: string; color: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [visibleRange, setVisibleRange] = useState<{ min: number; max: number } | null>(null);

  // Scroll scrubbing: track scroll within the timeline wrapper
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ['start end', 'end start'] });
  const [scrubberHeight, setScrubberHeight] = useState(0);

  // Map stored date range so we can compute what cards are "active"
  const [dateRange, setDateRange] = useState<{ min: number; max: number; span: number; height: number } | null>(null);

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    if (!dateRange) return;
    // progress: 0 = wrapper top at viewport bottom, 1 = wrapper bottom at viewport top
    // We map progress to how far down the scrubber line has traveled
    const lineH = Math.min(progress * 1.6, 1) * (totalHeight - 200);
    setScrubberHeight(Math.max(0, lineH));

    // Compute the "current date" the scrubber is pointing at
    // The timeline renders newest at top (low pixel offset) and oldest at bottom
    const fraction = lineH / (totalHeight - 200);
    const currentDate = dateRange.max - fraction * dateRange.span;
    setVisibleRange({ min: currentDate - 1.5, max: currentDate + 1.5 });
  });

  useEffect(() => {
    fetch('/timeline.json')
      .then((r) => r.json())
      .then((data: TimelineEntry[]) => {
        const now = new Date();
        const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const sorted = [...data].sort(
          (a, b) => dateToNumeric(b.start) - dateToNumeric(a.start)
        );

        const allDates = sorted.flatMap((e) => [
          dateToNumeric(e.start),
          dateToNumeric(e.end || currentDate),
        ]);
        const minDate = Math.min(...allDates);
        const maxDate = Math.max(dateToNumeric('2026-03'), Math.max(...allDates));
        const span = Math.max(0.5, maxDate - minDate);
        const height = span * 12 * CONFIG.monthHeight;

        setDateRange({ min: minDate, max: maxDate, span, height });

        const itemData = sorted.map((entry) => {
          const startDate = dateToNumeric(entry.start);
          const endDate = dateToNumeric(entry.end || currentDate);
          const endPos = ((maxDate - endDate) / span) * height;
          const startPos = ((maxDate - startDate) / span) * height;
          return {
            entry,
            startDate,
            endDate,
            idealTop: endPos,
            idealBottom: startPos,
            idealHeight: Math.max(CONFIG.minBoxHeight, startPos - endPos),
            sideClass: entry.type === 'education' ? 'left' : 'right',
          };
        });

        const left = adjustPositions(
          itemData.filter((i) => i.sideClass === 'left').sort((a, b) => a.idealTop - b.idealTop)
        );
        const right = adjustPositions(
          itemData.filter((i) => i.sideClass === 'right').sort((a, b) => a.idealTop - b.idealTop)
        );
        const all = [...left, ...right].sort(
          (a, b) => dateToNumeric(b.entry.start) - dateToNumeric(a.entry.start)
        );
        const placed: PlacedItem[] = all.map((item, i) => ({ ...item, globalIndex: i }));

        const maxUsed = Math.max(...placed.map((i) => i.finalTop + i.finalHeight));
        const finalHeight = Math.max(height, maxUsed) + CONFIG.extraTimelinePadding + 400;
        setTotalHeight(finalHeight);
        setItems(placed);

        // Year markers
        const years = new Set<number>();
        sorted.forEach((e) => {
          years.add(Math.floor(dateToNumeric(e.start)));
          if (e.end) years.add(Math.floor(dateToNumeric(e.end)));
        });
        const markers = Array.from(years).map((year) => ({
          year,
          top: ((maxDate - year) / span) * height,
          label: year.toString(),
          color: '#00bcd4',
        }));
        const march2026 = dateToNumeric('2026-03');
        if (maxDate === march2026 && march2026 > Math.max(...allDates)) {
          markers.push({
            year: 2026,
            top: ((maxDate - march2026) / span) * height,
            label: 'Mar 2026',
            color: '#ff6b35',
          });
        }
        setYearMarkers(markers);
      });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveIndex(null);
        setIsSticky(false);
      }
      if (e.key === 'ArrowRight' && activeIndex !== null && activeIndex < items.length - 1) {
        setActiveIndex((i) => (i ?? 0) + 1);
      }
      if (e.key === 'ArrowLeft' && activeIndex !== null && activeIndex > 0) {
        setActiveIndex((i) => (i ?? 0) - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, items.length]);

  const activeEntry = activeIndex !== null ? items.find((i) => i.globalIndex === activeIndex)?.entry : null;

  // Determine if a card is "within" the scrubber's current date window
  function isCardVisible(item: PlacedItem): boolean {
    if (!visibleRange) return true; // before any scroll: show all
    return item.startDate >= visibleRange.min && item.endDate <= visibleRange.max + 0.5;
  }

  // Direction hint for exit animation: left cards exit left, right cards exit right
  function exitX(item: PlacedItem): number {
    return item.sideClass === 'left' ? -40 : 40;
  }

  return (
    <div className="relative">
      {/* Frosted-glass sticky column headers */}
      <div
        className="timeline-headers sticky top-0 z-20 flex shadow-light"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.75)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="flex-1 text-center py-4 font-semibold text-text-secondary border-r border-border-color">
          Education
        </div>
        <div className="flex-1 text-center py-4 font-semibold text-text-secondary">
          Professional Experience
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="timeline-wrapper relative"
        style={{ minHeight: totalHeight }}
      >
        {/* Static center axis */}
        <div
          className="timeline-line absolute left-1/2 top-0 bottom-0 w-px bg-border-color"
          style={{ transform: 'translateX(-50%)' }}
          aria-hidden="true"
        />

        {/* Animated scrubber line that grows as user scrolls */}
        <div
          className="timeline-progress absolute left-1/2 top-0 w-[3px] rounded-full"
          style={{
            transform: 'translateX(-50%)',
            height: scrubberHeight,
            background: 'linear-gradient(to bottom, var(--primary-color), var(--secondary-color))',
            transition: 'height 0.08s linear',
            boxShadow: '0 0 8px rgba(0,188,212,0.5)',
          }}
          aria-hidden="true"
        />

        {/* Glowing scrubber head dot */}
        {scrubberHeight > 0 && (
          <div
            className="absolute left-1/2 z-10 w-4 h-4 rounded-full"
            style={{
              transform: 'translateX(-50%)',
              top: scrubberHeight - 8,
              background: 'var(--secondary-color)',
              boxShadow: '0 0 12px var(--secondary-color)',
              transition: 'top 0.08s linear',
            }}
            aria-hidden="true"
          />
        )}

        {/* Year markers */}
        {yearMarkers.map((m) => (
          <div
            key={m.label}
            className="absolute left-1/2 text-xs font-bold px-2 py-1 rounded-full z-10"
            style={{ top: m.top, transform: 'translateX(-50%)', background: m.color, color: 'white' }}
            aria-hidden="true"
          >
            {m.label}
          </div>
        ))}

        {/* Timeline items — animate in/out based on scroll position */}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const isActive = activeIndex === item.globalIndex;
            const isLeft = item.sideClass === 'left';
            const visible = isCardVisible(item);

            return (
              <motion.div
                key={item.globalIndex}
                className={`timeline-item absolute ${isLeft ? 'left-0 right-1/2 pr-8 text-right' : 'left-1/2 right-0 pl-8 text-left'}`}
                style={{ top: item.finalTop, height: item.finalHeight }}
                initial={{ opacity: 0, x: exitX(item) }}
                animate={
                  visible
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0.15, x: 0 }
                }
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div
                  className={`timeline-content cursor-pointer rounded-card p-4 shadow-light bg-white transition-all duration-300 hover:shadow-medium ${isActive ? 'ring-2' : ''}`}
                  style={
                    isActive
                      ? {
                          borderLeft: !isLeft ? '4px solid var(--secondary-color)' : undefined,
                          borderRight: isLeft ? '4px solid var(--secondary-color)' : undefined,
                          boxShadow: '0 0 0 2px var(--secondary-color)',
                        }
                      : {}
                  }
                  onMouseEnter={() => {
                    if (!isSticky) setActiveIndex(item.globalIndex);
                  }}
                  onMouseLeave={() => {
                    if (!isSticky) setTimeout(() => setActiveIndex(null), 200);
                  }}
                  onClick={() => {
                    setActiveIndex(item.globalIndex);
                    setIsSticky(true);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${item.entry.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveIndex(item.globalIndex);
                      setIsSticky(true);
                    }
                  }}
                >
                  {item.entry.logo && (
                    <img
                      src={item.entry.logo}
                      alt={`${item.entry.company || item.entry.institution} logo`}
                      className="h-8 object-contain mb-2 inline-block"
                      width="60"
                      height="32"
                    />
                  )}
                  <h3 className="text-sm font-semibold text-text-primary leading-tight">
                    {item.entry.title}
                  </h3>
                  <div className="text-xs text-text-secondary mt-1">
                    {item.entry.company || item.entry.institution}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {formatDate(item.entry.start)} – {formatDate(item.entry.end)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail popup */}
      <AnimatePresence>
        {activeEntry && (
          <motion.div
            className="fixed right-8 top-1/2 z-50 w-96 max-h-[80vh] overflow-y-auto bg-white rounded-card shadow-heavy"
            style={{ transform: 'translateY(-50%)' }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Details for ${activeEntry.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between p-4 border-b border-border-color"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: 'rgba(255,255,255,0.9)',
              }}
            >
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveIndex((i) => (i ?? 1) - 1)}
                  disabled={activeIndex === 0}
                  className="px-3 py-1 rounded text-sm bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ minWidth: 'unset', minHeight: 'unset' }}
                  aria-label="Previous item"
                >
                  ←
                </button>
                <button
                  onClick={() => setActiveIndex((i) => (i ?? -1) + 1)}
                  disabled={activeIndex === items.length - 1}
                  className="px-3 py-1 rounded text-sm bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ minWidth: 'unset', minHeight: 'unset' }}
                  aria-label="Next item"
                >
                  →
                </button>
              </div>
              <button
                onClick={() => {
                  setActiveIndex(null);
                  setIsSticky(false);
                }}
                className="text-text-secondary hover:text-text-primary text-lg leading-none"
                aria-label="Close details"
                style={{ minWidth: 'unset', minHeight: 'unset' }}
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {activeEntry.logo && (
                <img
                  src={activeEntry.logo}
                  alt={`${activeEntry.company || activeEntry.institution} logo`}
                  className="h-12 object-contain mb-4"
                  width="80"
                  height="48"
                />
              )}
              <h3 className="text-xl font-semibold text-text-primary mb-1">{activeEntry.title}</h3>
              <div className="text-text-secondary font-medium mb-1">
                {activeEntry.company || activeEntry.institution}
                {activeEntry.website && (
                  <a
                    href={activeEntry.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-primary"
                    aria-label="Visit website"
                    style={{ minWidth: 'unset', minHeight: 'unset' }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="inline"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </a>
                )}
              </div>
              {activeEntry.location && (
                <div className="text-text-secondary text-sm mb-1">{activeEntry.location}</div>
              )}
              <div className="text-text-secondary text-sm mb-4">
                {formatDate(activeEntry.start)} – {formatDate(activeEntry.end)}
              </div>
              <div
                className="text-text-secondary text-sm leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: activeEntry.description }}
              />
              {activeEntry.skills && activeEntry.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">
                    Skills &amp; Technologies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeEntry.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ background: 'rgba(0,188,212,0.1)', color: 'var(--primary-color)' }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-outside backdrop */}
      {isSticky && activeIndex !== null && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setActiveIndex(null);
            setIsSticky(false);
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
