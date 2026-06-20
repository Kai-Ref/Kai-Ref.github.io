import { useEffect } from 'react';
import type { RefObject } from 'react';

interface Options {
  enabled: boolean;
  containerRef: RefObject<HTMLElement | null>;
  activeIndex: number;
  count: number;
  onJump: (index: number) => void;
}

export function useSwipeNav({ enabled, containerRef, activeIndex, count, onJump }: Options) {
  useEffect(() => {
    if (!enabled) return;

    const element = containerRef.current;
    if (!element) return;

    let startY = 0;

    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? startY;
      const delta = startY - endY;
      if (Math.abs(delta) < 40) return;

      if (delta > 0) {
        onJump(Math.min(activeIndex + 1, count - 1));
      } else {
        onJump(Math.max(activeIndex - 1, 0));
      }
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [activeIndex, containerRef, count, enabled, onJump]);
}
