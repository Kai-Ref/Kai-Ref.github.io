// src/components/portfolio/map/BackgroundLayers.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { SATELLITE_IMAGES, OVERVIEW_IMAGES, DETAIL_IDS, MC, ANIM } from './constants';
import type { Chapter } from './types';

interface Props {
  chapter: Chapter;
}

// Chapters with no city assigned but that should still show a background image.
// Map chapter id → the OVERVIEW_IMAGES key to use.
const NULL_CITY_OVERRIDES: Record<string, string> = {
  'intro':               'germany',
  'karlsruhe-mannheim':  'germany',
  'mannheim-darmstadt':  'germany',
  'world-overview':      'world',
  'germany-return':      'germany',
  'germany-all-pins':    'germany',
  'outro':               'germany',
};

export function BackgroundLayers({ chapter }: Props) {
  const isDetail   = chapter.city !== null && DETAIL_IDS.has(chapter.id);
  const isOverview = chapter.city !== null && !isDetail;

  // Pick the right image source
  let imageSrc: string | null = null;
  if (isDetail && chapter.city) {
    imageSrc = SATELLITE_IMAGES[chapter.city] ?? null;
  } else if (isOverview && chapter.city) {
    imageSrc = OVERVIEW_IMAGES[chapter.city] ?? null;
  } else if (chapter.city === null) {
    // Transition/outro chapters: fall back to overview image via override map
    const overrideKey = NULL_CITY_OVERRIDES[chapter.id];
    if (overrideKey) imageSrc = OVERVIEW_IMAGES[overrideKey] ?? null;
  }

  return (
    <>
      {/* Base ocean colour — always visible underneath */}
      <div
        className="absolute inset-0"
        style={{ background: MC.ocean, zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Background image — crossfades between overview and satellite */}
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
