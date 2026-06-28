'use client';

import { useEffect, useState } from 'react';

const FAB_SIZE = 48;
const FAB_INSET_END = 16;
const COMPACT_SIZE = 40;
const MAX_LIFT = 200;

function getFabBaseBottomPx(): number {
  if (typeof document === 'undefined') return 88;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;bottom:var(--floating-chat-bottom);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const bottom = parseFloat(getComputedStyle(probe).bottom || '88');
  document.body.removeChild(probe);
  return Number.isFinite(bottom) ? bottom : 88;
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export type FabCollisionState = {
  liftPx: number;
  compact: boolean;
  fabSize: number;
};

export function useFabCollisionAvoidance(enabled: boolean) {
  const [state, setState] = useState<FabCollisionState>({
    liftPx: 0,
    compact: false,
    fabSize: FAB_SIZE,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let frame = 0;

    const evaluate = () => {
      frame = 0;
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      if (!mobile) {
        document.documentElement.style.setProperty('--floating-chat-lift', '0px');
        setState({ liftPx: 0, compact: false, fabSize: FAB_SIZE });
        return;
      }

      const baseBottom = getFabBaseBottomPx();
      const size = FAB_SIZE;
      const fabRight = window.innerWidth - FAB_INSET_END;
      const fabLeft = fabRight - size;

      let lift = 0;
      let compact = false;

      const targets = document.querySelectorAll<HTMLElement>('[data-fab-collision]');
      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const fabBottom = baseBottom + lift;
        const fabTop = window.innerHeight - fabBottom - size;
        const fabRect = {
          left: fabLeft - 10,
          top: fabTop - 10,
          right: fabRight + 10,
          bottom: window.innerHeight - fabBottom + 10,
        };

        if (!rectsOverlap(fabRect, rect)) return;

        const overlap = fabRect.bottom - rect.top + 14;
        if (overlap > lift) {
          lift = Math.min(MAX_LIFT, overlap);
        }
      });

      if (lift >= 88) {
        const fabBottom = baseBottom + lift;
        const fabTop = window.innerHeight - fabBottom - COMPACT_SIZE;
        const compactLeft = window.innerWidth - 12 - COMPACT_SIZE;
        targets.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const compactRect = {
            left: compactLeft - 6,
            top: fabTop - 6,
            right: window.innerWidth - 12 + 6,
            bottom: window.innerHeight - fabBottom + 6,
          };
          if (rectsOverlap(compactRect, rect)) {
            compact = true;
          }
        });
      }

      document.documentElement.style.setProperty('--floating-chat-lift', `${lift}px`);
      setState({
        liftPx: lift,
        compact,
        fabSize: compact ? COMPACT_SIZE : FAB_SIZE,
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(evaluate);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      document.documentElement.style.setProperty('--floating-chat-lift', '0px');
    };
  }, [enabled]);

  return state;
}
