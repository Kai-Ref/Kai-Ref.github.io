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
