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

  { id: 'germany-return',     duration: 0.8,  city: 'germany',
    label: { top: 'Germany', sub: 'back home' } },

  { id: 'frankfurt',          duration: 1.2,  city: 'frankfurt',
    label: { top: 'Frankfurt', sub: 'Hessen, Germany' } },

  { id: 'germany-all-pins',   duration: 1.0,  city: 'germany',
    label: { top: 'The Journey', sub: 'so far' } },
];

// Total scroll height = sum(duration) × 100vh  ≈ 12.2 → 1220vh
export const TOTAL_DURATION = CHAPTERS.reduce((s, c) => s + c.duration, 0);

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
export const PINS: Pin[] = [
  {
    key: 'karlsruhe',
    label: 'Karlsruhe',
    country: 'Germany',
    lat: 49.0069,
    lng: 8.4037,
    bgX: 0.42,
    bgY: 0.72,
    appearsAt: 'germany-overview',
    satelliteImage: '/images/cities/karlsruhe.webp',
    detail: 'Bachelor · 2 Student Positions',
    years: '2019 – 2023',
  },
  {
    key: 'mannheim',
    label: 'Mannheim',
    country: 'Germany',
    lat: 49.4875,
    lng: 8.466,
    bgX: 0.43,
    bgY: 0.65,
    appearsAt: 'karlsruhe-mannheim',
    satelliteImage: '/images/cities/mannheim.webp',
    detail: "Master's · Internship",
    years: '2023 – 2025',
  },
  {
    key: 'darmstadt',
    label: 'Darmstadt',
    country: 'Germany',
    lat: 49.8728,
    lng: 8.6512,
    bgX: 0.46,
    bgY: 0.58,
    appearsAt: 'mannheim-darmstadt',
    satelliteImage: '/images/cities/darmstadt.webp',
    detail: 'Research Assistant',
    years: '2024 – 2025',
  },
  {
    key: 'adelaide',
    label: 'Adelaide',
    country: 'Australia',
    lat: -34.9285,
    lng: 138.6007,
    bgX: 0.78,
    bgY: 0.72,
    appearsAt: 'world-overview',
    satelliteImage: '/images/cities/adelaide.webp',
    detail: 'Exchange Semester',
    years: '2025',
  },
  {
    key: 'frankfurt',
    label: 'Frankfurt',
    country: 'Germany',
    lat: 50.1109,
    lng: 8.6821,
    bgX: 0.44,
    bgY: 0.54,
    appearsAt: 'germany-return',
    satelliteImage: '/images/cities/frankfurt.webp',
    years: '2026 –',
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
  smooth:    { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  fast:      { duration: 0.3, ease: 'easeInOut' as const },
} as const;

// Sets of chapter ids for fast membership tests
export const DETAIL_IDS   = new Set(['karlsruhe', 'mannheim', 'darmstadt', 'adelaide', 'frankfurt']);
export const OVERVIEW_IDS = new Set([
  'germany-overview',
  'karlsruhe-mannheim',
  'mannheim-darmstadt',
  'world-overview',
  'germany-return',
  'germany-all-pins',
]);
export const WORLD_IDS    = new Set(['world-overview', 'adelaide-return']);

// Background images per city/country key
// Detail chapters (city satellite close-ups)
export const SATELLITE_IMAGES: Record<string, string> = {
  karlsruhe: '/images/cities/karlsruhe.webp',
  mannheim:  '/images/cities/mannheim.webp',
  darmstadt: '/images/cities/darmstadt.webp',
  adelaide:  '/images/cities/adelaide.webp',
  frankfurt: '/images/cities/frankfurt.webp',
};

// Overview chapters (country/continent backgrounds)
export const OVERVIEW_IMAGES: Record<string, string> = {
  germany:   '/images/countries/germany-overview.webp',
  world:     '/images/countries/australia-overview.webp', // world-overview uses Australia as bridge
  australia: '/images/countries/australia-overview.webp',
};
