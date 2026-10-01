import { describe, expect, it } from 'vitest';

import { getGameCardSurfaceDefaults } from './gameCardSurface';

describe('game card surface defaults', () => {
  it('recommends square cards for Bilibili Toy', () => {
    expect(getGameCardSurfaceDefaults('toy')).toEqual({
      ratio: '1:1',
      recommendation: 'B站动态推荐',
    });
  });

  it('recommends 3:4 cards for the Xiaohongshu MiniTool', () => {
    expect(getGameCardSurfaceDefaults('minitool')).toEqual({
      ratio: '3:4',
      recommendation: '小红书推荐',
    });
  });
});
