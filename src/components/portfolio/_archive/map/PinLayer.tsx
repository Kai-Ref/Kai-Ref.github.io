// src/components/portfolio/map/PinLayer.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { PINS, MC, CHAPTERS, DETAIL_IDS } from './constants';
import type { Chapter, Pin } from './types';

interface Props {
  chapter: Chapter;
  chapterIndex: number;
}

// Geographic bounding boxes used to map lat/lng → viewport %
// lngMin/latMax tuned so German pins land at ~40% from left, lower ~80% from top
const GEO_BOUNDS = {
  germany:   { lngMin: 3.9,   lngMax: 15.1,  latMin: 47.2,  latMax: 56.2  },
  australia: { lngMin: 112.9, lngMax: 153.7, latMin: -39.2, latMax: -10.7 },
  // World frame: Adelaide lng 138.6 → x=65% (35% from right), lat -34.9 → y=90% (10% from bottom)
  world:     { lngMin: 98.86, lngMax: 160,   latMin: -46.6, latMax: 70    },
};

type GeoBounds = typeof GEO_BOUNDS['germany'];

function lngLatToPercent(lng: number, lat: number, bounds: GeoBounds) {
  const x = ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100;
  // Larger lat = higher on screen → invert
  const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
  return { x, y };
}

function getActiveBounds(chapterId: string): GeoBounds {
  if (chapterId === 'world-overview') return GEO_BOUNDS.world;
  if (chapterId.includes('adelaide')) return GEO_BOUNDS.australia;
  return GEO_BOUNDS.germany;
}

// Which geographic frame is a chapter rendered in?
function geoFrameOf(chapterId: string): 'germany' | 'australia' | 'world' {
  if (chapterId === 'world-overview') return 'world';
  if (chapterId.includes('adelaide')) return 'australia';
  return 'germany';
}

function pinIsVisible(pin: Pin, chapter: Chapter, chapterIndex: number): boolean {
  // Hide all pins during city close-up (detail) chapters — no exceptions
  if (DETAIL_IDS.has(chapter.id)) return false;

  // Pin hasn't been introduced yet → always hidden
  const appearsAtIndex = CHAPTERS.findIndex(c => c.id === pin.appearsAt);
  if (chapterIndex < appearsAtIndex) return false;

  const frame   = geoFrameOf(chapter.id);
  const isAuPin = pin.key === 'adelaide';

  // On the world/departure frame: only show the Adelaide pin
  if (frame === 'world' && !isAuPin) return false;
  // On the Australia frame: only show Adelaide
  if (frame === 'australia' && !isAuPin) return false;
  // On Germany frames: hide Adelaide
  if (frame === 'germany' && isAuPin) return false;

  return true;
}

function PinMarker({ pin, bounds }: { pin: Pin; bounds: GeoBounds }) {
  const { x, y } = lngLatToPercent(pin.lng, pin.lat, bounds);
  return (
    <motion.div
      key={pin.key}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.1 }}
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      aria-label={pin.label}
    >
      {/* Dot only — no needle */}
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: MC.pin,
        border: '2.5px solid rgba(255,255,255,0.9)',
        boxShadow: `0 0 10px 2px rgba(255,107,53,0.45)`,
      }} />
    </motion.div>
  );
}

export function PinLayer({ chapter, chapterIndex }: Props) {
  const bounds = getActiveBounds(chapter.id);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 3 }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {PINS.map(pin =>
          pinIsVisible(pin, chapter, chapterIndex) ? (
            <PinMarker key={pin.key} pin={pin} bounds={bounds} />
          ) : null
        )}
      </AnimatePresence>
    </div>
  );
}
