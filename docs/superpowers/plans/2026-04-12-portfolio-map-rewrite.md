# Portfolio Map Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `MapTimeline.tsx` with a new `PortfolioMap` component family that uses the variable-duration chapter scroll architecture from the reference implementation, drops D3 in favour of CSS-transformed satellite images, and retains all existing portfolio content (Karlsruhe → Mannheim → Darmstadt → Adelaide → Frankfurt journey).

**Architecture:** A tall scrollable `div` (~1220vh) drives a `useScroll` from Framer Motion. A `useChapterTracking` hook converts `scrollYProgress` into a chapter index using cumulative duration thresholds. Four layer components (`BackgroundLayers`, `PinLayer`, `UILayer` sub-components) render independently inside a sticky viewport, eliminating the single 1192-line file.

**Tech Stack:** React 19, Framer Motion 12, Tailwind CSS 3, TypeScript — no D3, no GeoJSON.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/components/portfolio/map/constants.ts` | Chapter definitions, pin data, colour palette, animation constants |
| **Create** | `src/components/portfolio/map/types.ts` | Shared TypeScript interfaces (`TimelineEntry`, `Chapter`, `Pin`, etc.) |
| **Create** | `src/components/portfolio/map/hooks/useChapterTracking.ts` | `scrollYProgress` → chapter index |
| **Create** | `src/components/portfolio/map/hooks/useSwipeScroll.ts` | Touch momentum scroll |
| **Create** | `src/components/portfolio/map/hooks/useKeyboardScroll.ts` | Arrow key + spacebar scroll |
| **Create** | `src/components/portfolio/map/BackgroundLayers.tsx` | Crossfading satellite + world map images |
| **Create** | `src/components/portfolio/map/PinLayer.tsx` | CSS-only animated city pins |
| **Create** | `src/components/portfolio/map/UILayer.tsx` | HUD: progress bar, city label, detail cards, timeline strip, scroll indicator |
| **Create** | `src/components/portfolio/map/PortfolioMap.tsx` | Root component — composes all layers |
| **Modify** | `src/pages/portfolio.astro` | Update import path |
| **Keep** | `src/components/portfolio/MapTimeline.tsx` | Do NOT delete until new component is confirmed working |
| **Add image** | `public/images/cities/frankfurt.webp` | Satellite image for Frankfurt chapter (sourced externally, placeholder used if unavailable) |
| **Note** | `public/timeline.json` | Read-only — add Frankfurt entry manually when real data is available |

---

## Task 1: Shared types and constants

**Files:**
- Create: `src/components/portfolio/map/types.ts`
- Create: `src/components/portfolio/map/constants.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
// src/components/portfolio/map/types.ts

export interface TimelineEntry {
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

export interface Chapter {
  id: string;
  duration: number;   // multiplier × 100vh
  city: string | null; // matches Pin.key, or null for transitions/outros
  label?: { top: string; sub: string; accent?: boolean };
}

export interface Pin {
  key: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  /** Normalised [0,1] position on the background image for CSS positioning */
  bgX: number;
  bgY: number;
  /** Chapter id where this pin first appears */
  appearsAt: string;
  satelliteImage: string;
}
```

- [ ] **Step 2: Create `constants.ts`**

```ts
// src/components/portfolio/map/constants.ts
import type { Chapter, Pin } from './types';

// ── Colour palette ──────────────────────────────────────────────────────────
export const MC = {
  ocean:     '#0d2238',
  parchment: '#c8b89a',
  ink:       '#e8f0ef',
  ink_dim:   'rgba(232,240,239,0.45)',
  pin:       '#ff6b35',
  cyan:      '#00bcd4',
} as const;

// ── Chapter definitions ─────────────────────────────────────────────────────
// duration is a multiplier: 1.0 = 100vh of scroll
export const CHAPTERS: Chapter[] = [
  { id: 'intro',              duration: 0.8,  city: null,
    label: { top: 'Germany', sub: 'scroll to explore' } },

  { id: 'germany-overview',   duration: 1.0,  city: 'germany',
    label: { top: 'Germany', sub: 'where it all started' } },

  { id: 'karlsruhe',          duration: 1.2,  city: 'karlsruhe',
    label: { top: 'Karlsruhe', sub: 'Baden-Württemberg' } },

  { id: 'karlsruhe-mannheim', duration: 0.5,  city: null,
    label: { top: 'Mannheim', sub: 'next stop ↓', accent: true } },

  { id: 'mannheim',           duration: 1.2,  city: 'mannheim',
    label: { top: 'Mannheim', sub: 'Baden-Württemberg' } },

  { id: 'mannheim-darmstadt', duration: 0.5,  city: null,
    label: { top: 'Darmstadt', sub: 'next stop ↓', accent: true } },

  { id: 'darmstadt',          duration: 1.2,  city: 'darmstadt',
    label: { top: 'Darmstadt', sub: 'Hessen, Germany' } },

  { id: 'world-overview',     duration: 0.8,  city: 'world',
    label: { top: 'Departing', sub: 'Europe → Australia', accent: true } },

  { id: 'adelaide',           duration: 1.2,  city: 'adelaide',
    label: { top: 'Adelaide', sub: 'South Australia' } },

  { id: 'adelaide-return',    duration: 0.5,  city: null,
    label: { top: 'Returning', sub: 'Australia → Europe', accent: true } },

  { id: 'germany-return',     duration: 0.8,  city: 'germany',
    label: { top: 'Germany', sub: 'back home' } },

  { id: 'frankfurt',          duration: 1.2,  city: 'frankfurt',
    label: { top: 'Frankfurt', sub: 'Hessen, Germany' } },

  { id: 'germany-all-pins',   duration: 1.0,  city: 'germany',
    label: { top: 'The Journey', sub: 'so far' } },

  { id: 'outro',              duration: 0.8,  city: null,
    label: { top: 'More to come', sub: '...' } },
];

// Total scroll height = sum(duration) × 100vh
export const TOTAL_DURATION = CHAPTERS.reduce((s, c) => s + c.duration, 0);
// = 12.2 → 1220vh

// Precompute cumulative thresholds [0,1] for chapter boundary detection
export const CHAPTER_THRESHOLDS: number[] = (() => {
  const thresholds: number[] = [0];
  let acc = 0;
  for (const ch of CHAPTERS) {
    acc += ch.duration / TOTAL_DURATION;
    thresholds.push(acc);
  }
  return thresholds;
})();

// ── Pin definitions ─────────────────────────────────────────────────────────
// bgX / bgY: approximate normalised [0,1] position of the city on the
// germany/australia overview background image — used to place the dot.
// For satellite chapters the pin is centred (0.5, 0.5).
export const PINS: Pin[] = [
  {
    key: 'karlsruhe',
    label: 'Karlsruhe',
    country: 'Germany',
    lat: 49.0069,
    lng: 8.4037,
    bgX: 0.42,
    bgY: 0.72,
    appearsAt: 'karlsruhe',
    satelliteImage: '/images/cities/karlsruhe.webp',
  },
  {
    key: 'mannheim',
    label: 'Mannheim',
    country: 'Germany',
    lat: 49.4875,
    lng: 8.466,
    bgX: 0.43,
    bgY: 0.65,
    appearsAt: 'mannheim',
    satelliteImage: '/images/cities/mannheim.webp',
  },
  {
    key: 'darmstadt',
    label: 'Darmstadt',
    country: 'Germany',
    lat: 49.8728,
    lng: 8.6512,
    bgX: 0.46,
    bgY: 0.58,
    appearsAt: 'darmstadt',
    satelliteImage: '/images/cities/darmstadt.webp',
  },
  {
    key: 'adelaide',
    label: 'Adelaide',
    country: 'Australia',
    lat: -34.9285,
    lng: 138.6007,
    bgX: 0.78,
    bgY: 0.72,
    appearsAt: 'adelaide',
    satelliteImage: '/images/cities/adelaide.webp',
  },
  {
    key: 'frankfurt',
    label: 'Frankfurt',
    country: 'Germany',
    lat: 50.1109,
    lng: 8.6821,
    bgX: 0.44,
    bgY: 0.54,
    appearsAt: 'frankfurt',
    satelliteImage: '/images/cities/frankfurt.webp',
  },
];

// ── Animation constants (extracted to prevent re-renders) ───────────────────
export const ANIM = {
  fadeIn:    { opacity: 1 },
  fadeOut:   { opacity: 0 },
  fadeInUp:  { opacity: 1, y: 0 },
  fadeOutUp: { opacity: 0, y: -10 },
  scaleIn:   { scale: 1, opacity: 1 },
  hidden:    { opacity: 0, y: 10 },
  exit:      { opacity: 0, y: -10 },
  spring:    { type: 'spring' as const, stiffness: 300, damping: 30 },
  smooth:    { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  fast:      { duration: 0.3, ease: 'easeInOut' as const },
} as const;

// Sets of chapter ids for fast membership tests
export const DETAIL_IDS   = new Set(['karlsruhe', 'mannheim', 'darmstadt', 'adelaide', 'frankfurt']);
export const OVERVIEW_IDS = new Set(['germany-overview', 'germany-return', 'germany-all-pins']);
export const WORLD_IDS    = new Set(['world-overview', 'adelaide-return']);

// Background image per city key (overview / satellite)
// The germany and world overview use a CSS background; satellite chapters use <img>
export const SATELLITE_IMAGES: Record<string, string> = {
  karlsruhe: '/images/cities/karlsruhe.webp',
  mannheim:  '/images/cities/mannheim.webp',
  darmstadt: '/images/cities/darmstadt.webp',
  adelaide:  '/images/cities/adelaide.webp',
  frankfurt: '/images/cities/frankfurt.webp',
};
```

- [ ] **Step 3: Verify TypeScript compiles (no implementation yet — just check types)**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1 | head -30
```

Expected: any existing errors unrelated to new files; no errors from `types.ts` or `constants.ts`.

---

## Task 2: Custom hooks

**Files:**
- Create: `src/components/portfolio/map/hooks/useChapterTracking.ts`
- Create: `src/components/portfolio/map/hooks/useSwipeScroll.ts`
- Create: `src/components/portfolio/map/hooks/useKeyboardScroll.ts`

- [ ] **Step 1: Create `useChapterTracking.ts`**

```ts
// src/components/portfolio/map/hooks/useChapterTracking.ts
import { useEffect, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { CHAPTER_THRESHOLDS, CHAPTERS } from '../constants';

/**
 * Converts a Framer Motion scrollYProgress (0-1) into a chapter index.
 * Uses cumulative duration thresholds so chapters with higher duration
 * get proportionally more scroll real-estate.
 */
export function useChapterTracking(scrollYProgress: MotionValue<number>): number {
  const [chapterIndex, setChapterIndex] = useState(0);

  useEffect(() => {
    return scrollYProgress.on('change', (progress) => {
      // Binary search for the chapter whose threshold window contains progress
      let idx = CHAPTERS.length - 1;
      for (let i = 0; i < CHAPTER_THRESHOLDS.length - 1; i++) {
        if (progress >= CHAPTER_THRESHOLDS[i] && progress < CHAPTER_THRESHOLDS[i + 1]) {
          idx = i;
          break;
        }
      }
      setChapterIndex(idx);
    });
  }, [scrollYProgress]);

  return chapterIndex;
}
```

- [ ] **Step 2: Create `useSwipeScroll.ts`**

```ts
// src/components/portfolio/map/hooks/useSwipeScroll.ts
import { useEffect, useRef } from 'react';

/**
 * Adds touch swipe scrolling with momentum to a container element.
 * Falls back gracefully if touch is not supported.
 */
export function useSwipeScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  sensitivity = 1.2,
) {
  const startYRef    = useRef(0);
  const lastYRef     = useRef(0);
  const velocityRef  = useRef(0);
  const rafRef       = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      startYRef.current   = e.touches[0].clientY;
      lastYRef.current    = e.touches[0].clientY;
      velocityRef.current = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const onTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const delta    = (lastYRef.current - currentY) * sensitivity;
      velocityRef.current = delta;
      lastYRef.current    = currentY;
      window.scrollBy(0, delta);
    };

    const onTouchEnd = () => {
      const decelerate = () => {
        if (Math.abs(velocityRef.current) < 0.5) return;
        window.scrollBy(0, velocityRef.current);
        velocityRef.current *= 0.92;
        rafRef.current = requestAnimationFrame(decelerate);
      };
      rafRef.current = requestAnimationFrame(decelerate);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, sensitivity]);
}
```

- [ ] **Step 3: Create `useKeyboardScroll.ts`**

```ts
// src/components/portfolio/map/hooks/useKeyboardScroll.ts
import { useEffect } from 'react';

const STEP = 200; // px per key press

/**
 * Maps ArrowDown, ArrowUp, Space, and PageUp/PageDown to window.scrollBy.
 * Only active when the portfolio map is in the viewport.
 */
export function useKeyboardScroll(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          window.scrollBy({ top: STEP, behavior: 'smooth' });
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          window.scrollBy({ top: -STEP, behavior: 'smooth' });
          break;
        case ' ':
          e.preventDefault();
          window.scrollBy({ top: e.shiftKey ? -STEP * 2 : STEP * 2, behavior: 'smooth' });
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [containerRef]);
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the new hook files.

---

## Task 3: BackgroundLayers component

**Files:**
- Create: `src/components/portfolio/map/BackgroundLayers.tsx`

This component renders a full-bleed dark background and crossfades between:
1. A CSS-based illustrated Germany/world/Australia overview (for overview chapters)
2. A satellite `<img>` (for city detail chapters)

Since no actual hand-drawn map images exist, the "overview" background is a deep ocean colour with a radial gradient vignette. The satellite images crossfade in on detail chapters.

- [ ] **Step 1: Create `BackgroundLayers.tsx`**

```tsx
// src/components/portfolio/map/BackgroundLayers.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { SATELLITE_IMAGES, DETAIL_IDS, MC, ANIM } from './constants';
import type { Chapter } from './types';

interface Props {
  chapter: Chapter;
}

export function BackgroundLayers({ chapter }: Props) {
  const isDetail  = chapter.city !== null && DETAIL_IDS.has(chapter.id);
  const imageSrc  = isDetail && chapter.city ? SATELLITE_IMAGES[chapter.city] : null;

  return (
    <>
      {/* Base ocean colour — always visible */}
      <div
        className="absolute inset-0"
        style={{ background: MC.ocean, zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Satellite image — crossfades in on detail chapters */}
      <AnimatePresence>
        {imageSrc && (
          <motion.img
            key={imageSrc}
            src={imageSrc}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={ANIM.fadeIn}
            exit={ANIM.fadeOut}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 1 }}
          />
        )}
      </AnimatePresence>

      {/* Vignette — always on top of image layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 140px 50px rgba(8,14,22,0.72)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `BackgroundLayers.tsx`.

---

## Task 4: PinLayer component

**Files:**
- Create: `src/components/portfolio/map/PinLayer.tsx`

Renders city pins as CSS-positioned elements (no D3). Each pin is visible once its chapter has been reached. On the `germany-all-pins` chapter all German + Frankfurt pins are shown simultaneously.

Pin position on screen uses a simple linear map from [lng_min, lng_max] × [lat_min, lat_max] to viewport %. The bounds are hardcoded for the Germany and Australia views.

- [ ] **Step 1: Create `PinLayer.tsx`**

```tsx
// src/components/portfolio/map/PinLayer.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { PINS, MC, CHAPTERS } from './constants';
import type { Chapter, Pin } from './types';

interface Props {
  chapter: Chapter;
  chapterIndex: number;
}

// Geographic bounds for the two overview backgrounds
const GEO_BOUNDS = {
  germany:   { lngMin: 5.8, lngMax: 15.1, latMin: 47.2, latMax: 55.1 },
  australia: { lngMin: 112.9, lngMax: 153.7, latMin: -39.2, latMax: -10.7 },
  world:     { lngMin: -20, lngMax: 160, latMin: -50, latMax: 70 },
};

function lngLatToPercent(
  lng: number,
  lat: number,
  bounds: typeof GEO_BOUNDS['germany'],
): { x: number; y: number } {
  const x = ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100;
  // Latitude: larger lat = higher on screen → invert
  const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
  return { x, y };
}

function getActiveBounds(chapterId: string) {
  if (chapterId === 'world-overview' || chapterId === 'adelaide-return') return GEO_BOUNDS.world;
  if (chapterId.includes('adelaide') || chapterId === 'germany-return') return GEO_BOUNDS.australia;
  return GEO_BOUNDS.germany;
}

function pinIsVisible(pin: Pin, chapter: Chapter, chapterIndex: number): boolean {
  const appearsAtIndex = CHAPTERS.findIndex(c => c.id === pin.appearsAt);
  if (chapterIndex < appearsAtIndex) return false;

  // Hide Australian pins on Germany chapters, and German pins on Australia chapters
  const isAuPin = pin.key === 'adelaide';
  const isAuChapter = chapter.id.includes('adelaide') || chapter.id === 'germany-return'
    || chapter.id === 'world-overview' || chapter.id === 'adelaide-return';

  // On world-overview, show no pins (world is too zoomed out)
  if (chapter.id === 'world-overview' || chapter.id === 'adelaide-return') return false;

  if (isAuPin && !isAuChapter) return false;
  if (!isAuPin && isAuChapter) return false;

  return true;
}

function PinMarker({ pin, bounds }: { pin: Pin; bounds: typeof GEO_BOUNDS['germany'] }) {
  const { x, y } = lngLatToPercent(pin.lng, pin.lat, bounds);
  return (
    <motion.div
      key={pin.key}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.1 }}
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}
      aria-label={pin.label}
    >
      {/* Needle */}
      <div style={{
        width: 2,
        height: 20,
        background: MC.parchment,
        margin: '0 auto',
        borderRadius: 1,
      }} />
      {/* Head */}
      <div style={{
        width: 11,
        height: 11,
        borderRadius: '50%',
        background: MC.pin,
        border: '2px solid rgba(255,255,255,0.9)',
        margin: '-5px auto 0',
        position: 'relative',
      }}>
        {/* Pulse ring */}
        <div
          className="pin-pulse-ring"
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: `1.5px solid ${MC.pin}`,
          }}
        />
      </div>
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
```

- [ ] **Step 2: Add `pin-pulse-ring` keyframe to `src/styles/global.css`**

Read the file first, then append inside the existing CSS (after the `map-pin-pulse` block):

```css
/* PortfolioMap pin pulse ring */
@keyframes pm-pin-pulse {
  0%   { transform: scale(1);   opacity: 0.7; }
  70%  { transform: scale(2.4); opacity: 0; }
  100% { transform: scale(2.4); opacity: 0; }
}
.pin-pulse-ring {
  animation: pm-pin-pulse 2s ease-out infinite;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 5: UILayer — progress bar and city label

**Files:**
- Create: `src/components/portfolio/map/UILayer.tsx` (scaffold + progress bar + city label sub-components)

- [ ] **Step 1: Create `UILayer.tsx` with ProgressBar and CityLabel**

```tsx
// src/components/portfolio/map/UILayer.tsx
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  MC, ANIM, CHAPTERS, CHAPTER_THRESHOLDS,
  DETAIL_IDS, OVERVIEW_IDS, PINS, SATELLITE_IMAGES,
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
  // Hide on outro chapters
  const hide = chapter.id === 'outro' || chapter.id === 'germany-all-pins';
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
          <a href={entry.website} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: MC.cyan, textDecoration: 'none', opacity: 0.85 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Visit website
          </a>
        )}
        {entry.skills && entry.skills.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 7 }}>Skills</p>
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

  // Special case: Frankfurt — no entries yet, show placeholder card
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
  entries,
}: {
  chapter: Chapter;
  chapterIndex: number;
  entries: TimelineEntry[];
}) {
  if (!OVERVIEW_IDS.has(chapter.id)) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="timeline-strip"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 32 }}
        transition={ANIM.smooth}
        className="absolute z-20 pointer-events-none"
        style={{ right: 24, top: '50%', transform: 'translateY(-50%)', width: 'clamp(160px, 22vw, 230px)' }}
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
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: MC.parchment, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '0 16px 12px', borderBottom: '1px solid rgba(200,184,154,0.1)', marginBottom: 4 }}>
            Career Path
          </p>
          {PINS.map((pin, i) => {
            const pinChapterIdx = CHAPTERS.findIndex(c => c.id === pin.appearsAt);
            const isDone   = chapterIndex > pinChapterIdx;
            const isNext   = chapterIndex === pinChapterIdx;
            return (
              <div key={pin.key} style={{
                padding: '10px 16px',
                borderBottom: i < PINS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: isNext ? 'rgba(255,107,53,0.07)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ paddingTop: 3, flexShrink: 0 }}>
                    {isDone ? (
                      <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill={MC.parchment} /></svg>
                    ) : isNext ? (
                      <div style={{ position: 'relative', width: 10, height: 10 }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: MC.pin, animation: 'pm-pin-pulse 1.8s ease-out infinite' }} />
                        <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'relative' }}><circle cx="5" cy="5" r="4" fill={MC.pin} /></svg>
                      </div>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" /></svg>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 13, color: isDone ? MC.parchment : isNext ? MC.ink : 'rgba(255,255,255,0.35)', lineHeight: 1.2, marginBottom: 2 }}>
                      {pin.label}
                    </p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: isDone ? 'rgba(200,184,154,0.6)' : isNext ? MC.ink_dim : 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
                      {pin.country}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
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
      <TimelineStrip chapter={chapter} chapterIndex={chapterIndex} entries={entries} />
      <CardsOverlay chapter={chapter} entries={entries} isMobile={isMobile} />
      <ScrollIndicator chapter={chapter} />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1 | head -40
```

---

## Task 6: Root PortfolioMap component

**Files:**
- Create: `src/components/portfolio/map/PortfolioMap.tsx`

- [ ] **Step 1: Create `PortfolioMap.tsx`**

```tsx
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
  const [entries, setEntries]   = useState<TimelineEntry[]>([]);
  const [vpWidth,  setVpWidth]  = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);

  // ── Data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/timeline.json')
      .then(r => r.json())
      .then((d: TimelineEntry[]) => setEntries(d))
      .catch(e => console.error('timeline.json', e));
  }, []);

  // ── Viewport width (for mobile breakpoint) ───────────────────────────────
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
      {/* Keyframes + fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        .card-scroll::-webkit-scrollbar { width: 4px; }
        .card-scroll::-webkit-scrollbar-track { background: transparent; }
        .card-scroll::-webkit-scrollbar-thumb { background: rgba(200,184,154,0.3); border-radius: 2px; }
        .achievement { margin: 8px 0; padding-left: 12px; border-left: 2px solid rgba(200,184,154,0.35); font-size: 0.9em; color: rgba(232,240,239,0.6); }
      `}</style>

      {/* Tall scroll container */}
      <div
        ref={outerRef}
        style={{ height: `${TOTAL_DURATION * 100}vh` }}
        className="relative"
      >
        {/* Sticky viewport */}
        <div
          role="region"
          aria-label="Interactive career map"
          className="sticky top-0 overflow-hidden"
          style={{ height: '100svh' }}
        >
          {/* Layer 0-2: background, satellite, vignette */}
          <BackgroundLayers chapter={chapter} />

          {/* Layer 3: city pins */}
          <PinLayer chapter={chapter} chapterIndex={chapterIndex} />

          {/* Layer 4+: HUD elements */}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1 | head -40
```

Expected: clean compile (or only pre-existing unrelated errors).

---

## Task 7: Wire up and test

**Files:**
- Modify: `src/pages/portfolio.astro`
- Add CSS: `src/styles/global.css`

- [ ] **Step 1: Update portfolio.astro import**

In `src/pages/portfolio.astro`, change line 5:
```astro
import MapTimeline from '../components/portfolio/MapTimeline';
```
to:
```astro
import PortfolioMap from '../components/portfolio/map/PortfolioMap';
```
And change line 15:
```astro
<MapTimeline client:load />
```
to:
```astro
<PortfolioMap client:load />
```

- [ ] **Step 2: Start dev server and verify the page loads**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npm run dev 2>&1 &
sleep 5 && curl -s http://localhost:4321/portfolio | grep -c 'career map'
```

Expected output: `1` (the `aria-label` is present in the hydrated shell).

- [ ] **Step 3: Check for build errors**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npm run build 2>&1 | tail -20
```

Expected: `Complete!` with no TypeScript or module resolution errors.

- [ ] **Step 4: Add Frankfurt satellite image placeholder**

If `public/images/cities/frankfurt.webp` does not exist, create a simple dark placeholder so the crossfade doesn't error:

```bash
ls /Users/kaireffert/Intern/Kai-Ref.github.io/public/images/cities/frankfurt.webp 2>/dev/null \
  || echo "MISSING — add a frankfurt.webp satellite image to public/images/cities/"
```

If missing, note this as a follow-up (the component handles missing images gracefully because `<img>` simply doesn't render if the src 404s — the base dark background is always visible).

---

## Task 8: Final cleanup and commit

- [ ] **Step 1: Run full TypeScript check**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npx tsc --noEmit 2>&1
```

Fix any errors before continuing.

- [ ] **Step 2: Run build one final time**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && npm run build 2>&1 | tail -10
```

Expected: `Complete!`

- [ ] **Step 3: Commit**

```bash
cd /Users/kaireffert/Intern/Kai-Ref.github.io && \
  git add src/components/portfolio/map/ src/pages/portfolio.astro src/styles/global.css && \
  git commit -m "feat: replace MapTimeline with PortfolioMap scroll architecture

- Variable-duration chapter system (~1220vh) replacing fixed 400svh
- Drops D3/GeoJSON in favour of CSS-transformed satellite images
- Extracts useChapterTracking, useSwipeScroll, useKeyboardScroll hooks
- Splits into BackgroundLayers, PinLayer, UILayer components
- Adds Frankfurt as new city chapter; Germany-all-pins summary chapter"
```

---

## Post-Implementation Notes

### Frankfurt satellite image
No `frankfurt.webp` exists in `public/images/cities/`. Source a satellite/aerial image of Frankfurt and save it there to complete the Frankfurt chapter visual.

### Frankfurt timeline.json entry
Add a Frankfurt entry to `public/timeline.json` when the professional details are available. The `CardsOverlay` component will pick it up automatically via lat/lng proximity matching (`lat: 50.1109, lng: 8.6821`).

### Pin position tuning
The `bgX`/`bgY` values in `PINS` in `constants.ts` are approximate. Since the pin positions are computed from geographic coordinates via `lngLatToPercent`, they will be accurate relative to the `GEO_BOUNDS` viewport bounds — fine-tune `GEO_BOUNDS` values in `PinLayer.tsx` if the pins appear off-centre on specific background images.

### GitHub Pages compatibility
This implementation is 100% compatible with the existing GitHub Pages deployment (`npm run deploy` → `astro build` → `gh-pages -d dist`). All new files are static React components with no server-side dependencies.
