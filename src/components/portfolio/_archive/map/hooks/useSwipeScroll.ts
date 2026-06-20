// src/components/portfolio/map/hooks/useSwipeScroll.ts
import { useEffect, useRef } from 'react';
import { CHAPTERS, CHAPTER_THRESHOLDS, TOTAL_DURATION } from '../constants';

/**
 * Mobile swipe: one swipe gesture snaps to the exact start of the
 * next or previous chapter via window.scrollTo.
 *
 * A swipe is recognised when the finger travels more than THRESHOLD px
 * vertically before lifting. Direction determines ±1 chapter.
 */
const THRESHOLD = 30; // px minimum travel to count as intentional swipe

export function useSwipeScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  chapterIndex: number,
) {
  const startYRef  = useRef(0);
  const swipedRef  = useRef(false); // prevent double-firing per gesture

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      startYRef.current = e.touches[0].clientY;
      swipedRef.current = false;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (swipedRef.current) return;
      const endY  = e.changedTouches[0].clientY;
      const delta = startYRef.current - endY; // positive = swipe up = scroll forward

      if (Math.abs(delta) < THRESHOLD) return;

      swipedRef.current = true;

      const direction = delta > 0 ? 1 : -1; // +1 next chapter, -1 prev chapter
      const targetIndex = Math.min(
        Math.max(chapterIndex + direction, 0),
        CHAPTERS.length - 1,
      );

      // Compute the absolute scroll position of the target chapter's start
      const totalScrollPx = TOTAL_DURATION * window.innerHeight;
      const targetScrollY = CHAPTER_THRESHOLDS[targetIndex] * totalScrollPx;

      window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [containerRef, chapterIndex]);
}
