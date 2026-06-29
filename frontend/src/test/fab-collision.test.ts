import { describe, it, expect } from 'vitest';

function liftToClearTarget(
  targetTop: number,
  baseBottom: number,
  viewportHeight: number
): number {
  const lift = viewportHeight - baseBottom - targetTop + 14;
  return Math.max(0, lift);
}

function needsLift(
  targetBottom: number,
  targetTop: number,
  baseBottom: number,
  viewportHeight: number,
  size: number
): number {
  const defaultFabTop = viewportHeight - baseBottom - size;
  if (targetBottom <= defaultFabTop - 14) return 0;
  return liftToClearTarget(targetTop, baseBottom, viewportHeight);
}

describe('FAB collision lift', () => {
  const viewportHeight = 800;
  const baseBottom = 88;
  const size = 48;

  it('requires no lift when target ends above the default FAB zone', () => {
    expect(needsLift(600, 520, baseBottom, viewportHeight, size)).toBe(0);
  });

  it('lifts the FAB above overlapping Tahadu card content', () => {
    const cardTop = 620;
    const cardBottom = 780;
    const lift = needsLift(cardBottom, cardTop, baseBottom, viewportHeight, size);
    const fabBottom = viewportHeight - baseBottom - lift;
    expect(fabBottom).toBeLessThanOrEqual(cardTop - 14);
  });
});
