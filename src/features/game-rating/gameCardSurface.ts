import type { CardRatio } from '../card-export/types';

export type GameCardSurface = 'browser' | 'toy' | 'minitool';

export interface GameCardSurfaceDefaults {
  ratio: CardRatio;
  recommendation: string | null;
}

export const GAME_CARD_SURFACE_DEFAULTS: Record<GameCardSurface, GameCardSurfaceDefaults> = {
  browser: { ratio: '4:5', recommendation: null },
  toy: { ratio: '1:1', recommendation: 'B站动态推荐' },
  minitool: { ratio: '3:4', recommendation: '小红书推荐' },
};

export function getGameCardSurfaceDefaults(surface: GameCardSurface): GameCardSurfaceDefaults {
  return GAME_CARD_SURFACE_DEFAULTS[surface];
}
