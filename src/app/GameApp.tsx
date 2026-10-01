import { GameRatingPilot } from '../features/game-rating/GameRatingPilot';
import { appMetadata } from '../config/appMetadata';
import { useI18n } from '../i18n/useI18n';
import { platformServices } from '../platform';
import type { GameCardSurface } from '../features/game-rating/gameCardSurface';

interface GameAppProps {
  cardSurface?: GameCardSurface;
}

/** The games repository has its own root product shell. It must not render the music shell. */
export function GameApp({ cardSurface = 'browser' }: GameAppProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <main className="mx-auto min-h-screen min-w-0 max-w-6xl overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
      <section className="min-w-0 rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm dark:border-cyan-900 dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-cyan-700 dark:text-cyan-300">
              XDRATE GAMES
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              多维游戏评价
            </h1>
          </div>
          <div className="flex max-w-44 shrink-0 flex-col items-end gap-1 sm:max-w-none">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="sr-only">{t('app.language')}</span>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={locale}
                onChange={(event) => setLocale(event.target.value as typeof locale)}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <p
              className="text-right text-xs font-medium text-slate-500 dark:text-slate-400"
              data-testid="app-version"
            >
              游戏试验版 {appMetadata.version} · {appMetadata.publisher} ·{' '}
              {platformServices.runtime.kind === 'desktop' ? '桌面模式' : '浏览器 / Toy 模式'}
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          离线优先、可配置、可分享的游戏评价体验。模板中的分数和理由是作者个人记录，不代表官方结论、排行榜或平台推荐。
        </p>
      </section>

      <GameRatingPilot cardSurface={cardSurface} />

      <footer className="mx-auto mt-8 max-w-6xl pb-8" data-testid="game-privacy">
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
          本游戏评分器不联网、不读取平台账号，也不会自动发布内容。评分草稿、模板和封面仅保存在当前容器的本地缓存中；PNG
          只在你主动导出时生成。
        </div>
      </footer>
    </main>
  );
}
