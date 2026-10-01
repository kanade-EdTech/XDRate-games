import { describe, expect, it } from 'vitest';

import { createSeededGameTemplateCatalog } from './templateCatalog';
import { calculateGameRating, gameRatingAlgorithmVersion } from './calculateGameRating';

describe('calculateGameRating', () => {
  it('uses a game-specific algorithm version', () => {
    expect(gameRatingAlgorithmVersion).toBe('game-linear-100-v1');
  });

  it('treats negative values as direct percentage-point deductions', () => {
    const redAlert = createSeededGameTemplateCatalog().templates.find(
      (template) => template.id === 'game-example-long-title',
    );
    expect(redAlert).toBeDefined();

    const result = calculateGameRating(redAlert!.rating);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.positiveScore100).toBeCloseTo(78.9655, 4);
      expect(result.penalty100).toBe(-3);
      expect(result.score100).toBe(76);
    }
  });

  it('clamps accumulated deductions at zero', () => {
    const redAlert = createSeededGameTemplateCatalog().templates.find(
      (template) => template.id === 'game-example-long-title',
    )!;
    const result = calculateGameRating({
      axes: redAlert.rating.axes,
      negativeItems: [
        { id: 'one', name: 'One', score: -50, enabled: true, reason: '' },
        { id: 'two', name: 'Two', score: -50, enabled: true, reason: '' },
      ],
    });
    expect(result).toMatchObject({ status: 'ready', penalty100: -100, score100: 0 });
  });
});
