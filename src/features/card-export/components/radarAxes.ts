import type { RatingAxis } from '../../../domain/rating/types';

/** The game template storage contract permits up to twelve rating axes. */
export const MAX_RADAR_AXES = 12;

export function getRadarDisplayAxes(axes: RatingAxis[]): RatingAxis[] {
  return axes.slice(0, MAX_RADAR_AXES);
}
