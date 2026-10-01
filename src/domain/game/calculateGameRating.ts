import { calculateRating } from '../rating/calculateRating';
import type { RatingResult } from '../rating/types';
import type { GameRatingDraft } from './types';

/**
 * Game scores use a 100-point aggregate. A negative item therefore represents
 * the exact number of points removed from that aggregate: -3 means -3/100.
 */
export const gameRatingAlgorithmVersion = 'game-linear-100-v1' as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToOneDecimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function calculateGameRating(
  draft: Pick<GameRatingDraft, 'axes' | 'negativeItems'>,
): RatingResult {
  // Keep the proven weighted-axis calculation shared with the music domain,
  // while applying the game domain's direct percentage-point deduction.
  const positiveResult = calculateRating({ axes: draft.axes, negativeItems: [] });
  if (positiveResult.status === 'uncalculable') return positiveResult;

  const penalty100 = draft.negativeItems
    .filter((item) => item.enabled && Number.isFinite(item.score))
    .reduce((sum, item) => sum + item.score, 0);

  return {
    ...positiveResult,
    penalty100,
    score100: roundToOneDecimal(clamp(positiveResult.positiveScore100 + penalty100, 0, 100)),
  };
}
