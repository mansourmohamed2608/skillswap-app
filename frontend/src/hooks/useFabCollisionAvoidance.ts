'use client';

import { useEffect, useState } from 'react';

export const FAB_COLLISION_SELECTOR = '[data-fab-collision]';

const FAB_SIZE = 48;
const FAB_INSET_END = 16;
const COMPACT_SIZE = 40;
const COLUMN_BUFFER = 12;
const CLEAR_MARGIN = 14;
const MIN_TOP = 72;

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

function getFabColumnBounds(viewportWidth: number, size: number) {
  const fabRight = viewportWidth - FAB_INSET_END;
  const fabLeft = fabRight - size;
  return {
    left: fabLeft - COLUMN_BUFFER,
    right: fabRight + COLUMN_BUFFER,
  };
}

function horizontalOverlap(
  target: DOMRect,
  column: { left: number; right: number }
): boolean {
  return target.right > column.left && target.left < column.right;
}

/** Lift (px added to bottom offset) so the FAB sits fully above the target. */
function liftToClearTarget(
  targetTop: number,
  baseBottom: number,
  viewportHeight: number,
  size: number
): number {
  const lift = viewportHeight - baseBottom - targetTop + CLEAR_MARGIN;
  return Math.max(0, lift);
}

function getFabScreenRect(
  viewportHeight: number,
  viewportWidthPx: number,
  baseBottom: number,
  lift: number,
  size: number,
  insetEnd: number
) {
  const bottomOffset = baseBottom + lift;
  const top = viewportHeight - bottomOffset - size;
  const right = viewportWidthPx - insetEnd;
  return {
    top,
    bottom: viewportHeight - bottomOffset,
    left: right - size,
    right,
  };
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export type FabCollisionState = {
  liftPx: number;
  compact: boolean;
  fabSize: number;
  dockTop: number | null;
};

export function useFabCollisionAvoidance(enabled: boolean) {
  const [state, setState] = useState<FabCollisionState>({
    liftPx: 0,
    compact: false,
    fabSize: FAB_SIZE,
    dockTop: null,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let frame = 0;

    const evaluate = () => {
      frame = 0;
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      if (!mobile) {
        document.documentElement.style.setProperty('--floating-chat-lift', '0px');
        setState({ liftPx: 0, compact: false, fabSize: FAB_SIZE, dockTop: null });
        return;
      }

      const viewportHeight = window.innerHeight;
      const viewportWidthPx = window.innerWidth;
      const baseBottom = getFabBaseBottomPx();
      const targets = document.querySelectorAll<HTMLElement>(FAB_COLLISION_SELECTOR);

      const resolve = (size: number, insetEnd: number) => {
        const column = getFabColumnBounds(viewportWidthPx, size);
        let lift = 0;

        targets.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          if (!horizontalOverlap(rect, column)) return;

          const defaultFabTop = viewportHeight - baseBottom - size;
          if (rect.bottom <= defaultFabTop - CLEAR_MARGIN) return;

          const needed = liftToClearTarget(rect.top, baseBottom, viewportHeight, size);
          if (needed > lift) lift = needed;
        });

        const maxLift = Math.max(
          0,
          viewportHeight - baseBottom - size - MIN_TOP
        );
        lift = Math.min(lift, maxLift);

        const fabRect = getFabScreenRect(viewportHeight, viewportWidthPx, baseBottom, lift, size, insetEnd);
        let stillOverlaps = false;
        let minOverlapTop = viewportHeight;

        targets.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          if (!horizontalOverlap(rect, column)) return;
          if (rectsOverlap(fabRect, rect)) {
            stillOverlaps = true;
            minOverlapTop = Math.min(minOverlapTop, rect.top);
          }
        });

        return { lift, stillOverlaps, minOverlapTop, fabRect };
      };

      let size = FAB_SIZE;
      let insetEnd = FAB_INSET_END;
      let { lift, stillOverlaps, minOverlapTop } = resolve(size, insetEnd);

      let compact = false;
      if (stillOverlaps) {
        compact = true;
        size = COMPACT_SIZE;
        insetEnd = 12;
        ({ lift, stillOverlaps, minOverlapTop } = resolve(size, insetEnd));
      }

      let dockTop: number | null = null;
      if (stillOverlaps && Number.isFinite(minOverlapTop)) {
        dockTop = Math.max(MIN_TOP, minOverlapTop - size - CLEAR_MARGIN);
      }

      document.documentElement.style.setProperty('--floating-chat-lift', `${lift}px`);
      setState({
        liftPx: lift,
        compact,
        fabSize: size,
        dockTop,
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
