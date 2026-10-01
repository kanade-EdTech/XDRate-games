import { describe, expect, it } from 'vitest';

import type { CardLayoutBox } from './types';
import { findLayoutCollisions, findOutOfBoundsRegions } from './layoutEngine';

function box(
  id: string,
  region: CardLayoutBox['region'],
  left: number,
  top: number,
  width: number,
  height: number,
  ancestorIds: string[] = [],
): CardLayoutBox {
  return {
    id,
    region,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    ancestorIds,
  };
}

describe('LayoutEngine geometry audit', () => {
  it('does not classify touching edges as overlap', () => {
    const boxes = [
      box('header-0', 'header', 0, 0, 100, 40),
      box('score-1', 'score', 0, 40, 100, 40),
    ];
    expect(findLayoutCollisions(boxes)).toEqual([]);
  });

  it('reports a real two-dimensional intersection', () => {
    const boxes = [
      box('header-0', 'header', 0, 0, 100, 50),
      box('score-1', 'score', 20, 30, 100, 50),
    ];
    expect(findLayoutCollisions(boxes)).toEqual([
      {
        firstRegion: 'header',
        secondRegion: 'score',
        overlapWidth: 80,
        overlapHeight: 20,
      },
    ]);
  });

  it('ignores intentional ancestor and descendant containment', () => {
    const boxes = [
      box('chart-0', 'chart', 0, 0, 200, 200),
      box('axes-1', 'axes', 20, 20, 100, 100, ['chart-0']),
    ];
    expect(findLayoutCollisions(boxes)).toEqual([]);
  });

  it('reports regions that leave the logical card bounds', () => {
    const card = box('card', 'card', 0, 0, 300, 300);
    const boxes = [
      box('header-0', 'header', 10, 10, 100, 40),
      box('footer-1', 'footer', 10, 290, 100, 20),
    ];
    expect(findOutOfBoundsRegions(card, boxes)).toEqual(['footer']);
  });
});
