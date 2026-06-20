// src/components/portfolio/map/hooks/useKeyboardScroll.ts
import { useEffect } from 'react';

const STEP = 200; // px per key press

/**
 * Maps ArrowDown, ArrowUp, Space, and PageUp/PageDown to window.scrollBy.
 */
export function useKeyboardScroll(
  _containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
  }, []);
}
