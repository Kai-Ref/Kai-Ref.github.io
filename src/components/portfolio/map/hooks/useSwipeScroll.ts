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
  const lastYRef     = useRef(0);
  const velocityRef  = useRef(0);
  const rafRef       = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
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
