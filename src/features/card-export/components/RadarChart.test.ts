import { describe, expect, it } from 'vitest';

import type { RatingAxis } from '../../../domain/rating/types';
import { getRadarDisplayAxes, MAX_RADAR_AXES } from './radarAxes';

function axis(id: string): RatingAxis {
  return { id, name: id, score: 8, importanceLevel: 3, enabled: true, reason: '' };
}

describe('radar chart axis capacity', () => {
  it('keeps all nine game axes instead of truncating at eight', () => {
    const axes = Array.from({ length: 9 }, (_, index) => axis(`axis-${index + 1}`));
    expect(getRadarDisplayAxes(axes)).toHaveLength(9);
    expect(getRadarDisplayAxes(axes).at(-1)?.id).toBe('axis-9');
  });

  it('caps only beyond the domain storage limit', () => {
    const axes = Array.from({ length: 14 }, (_, index) => axis(`axis-${index + 1}`));
    expect(getRadarDisplayAxes(axes)).toHaveLength(MAX_RADAR_AXES);
  });
});
