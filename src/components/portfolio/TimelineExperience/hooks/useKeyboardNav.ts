import { useEffect } from 'react';

interface Options {
  count: number;
  activeIndex: number | null;
  onJump: (index: number) => void;
  isEnabled?: boolean;
}

export function useKeyboardNav({ count, activeIndex, onJump, isEnabled = true }: Options) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (count === 0) return;

      const target = event.target;
      const withinTimeline = target instanceof HTMLElement && target.closest('[data-timeline-root="true"]');
      if (!withinTimeline) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        onJump(Math.min((activeIndex ?? -1) + 1, count - 1));
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        onJump(Math.max((activeIndex ?? 1) - 1, 0));
      }

      if (event.key === 'Home') {
        event.preventDefault();
        onJump(0);
      }

      if (event.key === 'End') {
        event.preventDefault();
        onJump(count - 1);
      }

      if (event.key === 'Escape' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, count, isEnabled, onJump]);
}
