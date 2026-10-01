import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

import {
  calculateGameRating,
  gameRatingAlgorithmVersion,
} from '../../domain/game/calculateGameRating';
import type { MusicRatingDraft } from '../../domain/rating/types';
import type { GameRatingDraft } from '../../domain/game/types';
import { platformServices } from '../../platform';
import { createMiniToolPlatformServices } from '../../platform/minitoolPlatform';
import { CardPreview, type CardOverflowResult, type CardRatio } from '../card-export/CardPreview';
import { ALL_CARD_RATIOS } from '../card-export/ratioConfig';
import type { CardOptions } from '../card-export/types';
import blackMythCover from '../../../assets/game-templates/covers/black-myth-wukong.webp';
import callOfDutyCover from '../../../assets/game-templates/covers/call-of-duty-4.webp';
import genshinCover from '../../../assets/game-templates/covers/genshin-impact.webp';
import redAlertCover from '../../../assets/game-templates/covers/red-alert-2.webp';
import { getGameCardSurfaceDefaults, type GameCardSurface } from './gameCardSurface';

const coverAssets: Record<string, string> = {
  'assets/game-templates/covers/red-alert-2.webp': redAlertCover,
  'assets/game-templates/covers/call-of-duty-4.webp': callOfDutyCover,
  'assets/game-templates/covers/genshin-impact.webp': genshinCover,
  'assets/game-templates/covers/black-myth-wukong.webp': blackMythCover,
};

function toCardDraft(draft: GameRatingDraft): MusicRatingDraft {
  return {
    mode: draft.mode,
    work: {
      productLabel: 'XDRATE GAMES · RATING CARD',
      title: draft.work.title,
      artistLabel: '平台',
      artist: draft.work.platform,
      albumLabel: '版本',
      album: draft.work.version,
      extraFields: [
        ...(draft.work.releaseNote.trim()
          ? [
              {
                id: 'release-info',
                label: draft.work.releaseLabel?.trim() || '工作室',
                value: draft.work.releaseNote,
              },
            ]
          : []),
        ...draft.work.extraFields,
      ],
      releaseYear: '',
      coverDataUrl:
        draft.work.coverDataUrl ??
        (draft.work.coverAssetPath ? (coverAssets[draft.work.coverAssetPath] ?? null) : null),
    },
    axes: draft.axes,
    negativeItems: draft.negativeItems,
    overallComment: draft.overallComment,
    personalStory: draft.personalStory,
    personalSignature: draft.personalSignature,
  };
}

function safeFileName(title: string): string {
  return (
    title
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .slice(0, 80) || 'XDRate-Games'
  );
}

export function GameCardExport({
  draft,
  surface = 'browser',
}: {
  draft: GameRatingDraft;
  surface?: GameCardSurface;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const surfaceDefaults = getGameCardSurfaceDefaults(surface);
  const [options, setOptions] = useState<CardOptions>({
    ratio: surfaceDefaults.ratio,
    theme: 'light',
    showReasons: true,
    showStory: true,
  });
  const [overflow, setOverflow] = useState<CardOverflowResult>({ hasOverflow: false, issues: [] });
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [lastImage, setLastImage] = useState<{ dataUrl: string; snapshot: string } | null>(null);
  const [shareChoiceOpen, setShareChoiceOpen] = useState(false);
  const cardDraft = useMemo(() => toCardDraft(draft), [draft]);
  const rating = useMemo(() => calculateGameRating(draft), [draft]);
  const snapshot = useMemo(() => JSON.stringify({ draft, options }), [draft, options]);

  function persistSnapshot() {
    try {
      localStorage.setItem('xdrate.games.export-snapshot.v1', snapshot);
    } catch {
      // Storage is best-effort; export/share must still be usable in private contexts.
    }
  }

  async function createImage(): Promise<string | null> {
    if (!cardRef.current || !ready || rating.status !== 'ready') {
      setMessage('评分卡仍在准备中，请稍后再试。');
      return null;
    }
    if (overflow.hasOverflow) {
      setMessage('当前比例仍有内容溢出，请更换比例或缩短文字。');
      return null;
    }
    persistSnapshot();
    await document.fonts.ready;
    const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
    setLastImage({ dataUrl, snapshot });
    return dataUrl;
  }

  function suggestedName() {
    return `${safeFileName(draft.work.title)}-XDRate-Games-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.png`;
  }

  async function exportPng() {
    setExporting(true);
    setMessage('正在生成 PNG…');
    try {
      const dataUrl = await createImage();
      if (!dataUrl) return;
      const result = await platformServices.files.saveBinaryFile({
        contents: dataUrl,
        mediaType: 'image/png',
        suggestedName: suggestedName(),
      });
      if (result.status === 'cancelled') {
        setMessage('保存已取消，当前草稿和评分卡仍保留。');
      } else if (result.status === 'failed') {
        setMessage(`保存失败（${result.reason}），当前草稿仍保留。`);
      } else {
        setMessage('PNG 已保存，可从相册或文件中分享。');
      }
    } catch {
      setMessage('PNG 生成失败，请稍后重试。');
    } finally {
      setExporting(false);
    }
  }

  async function shareImage(dataUrl: string) {
    persistSnapshot();
    const miniTool = createMiniToolPlatformServices(window);
    if (miniTool.isAlbumBridgeAvailable()) {
      const result = await miniTool.savePngToAlbum(dataUrl);
      if (result.status === 'completed') setMessage('图片已保存到系统相册，可继续分享。');
      else if (result.status === 'cancelled') setMessage('分享已取消，当前草稿和评分卡仍保留。');
      else if (result.status === 'denied') setMessage('相册权限未授予，当前草稿和评分卡仍保留。');
      else if (result.status === 'unavailable') setMessage('当前环境暂不支持保存到相册。');
      else setMessage('图片保存失败，当前草稿和评分卡仍保留。');
      return;
    }
    if ('xhs' in window) {
      setMessage('当前小红书容器未提供相册能力，请保留预览后重试。');
      return;
    }
    try {
      const result = await platformServices.files.saveBinaryFile({
        contents: dataUrl,
        mediaType: 'image/png',
        suggestedName: suggestedName(),
      });
      setMessage(
        result.status === 'cancelled'
          ? '分享已取消，当前草稿和评分卡仍保留。'
          : '图片已保存，可继续分享。',
      );
    } catch {
      setMessage('图片保存失败，当前草稿和评分卡仍保留。');
    }
  }

  async function shareNewImage() {
    setShareChoiceOpen(false);
    setExporting(true);
    setMessage('正在生成用于分享的新图片…');
    try {
      const dataUrl = await createImage();
      if (dataUrl) await shareImage(dataUrl);
    } catch {
      setMessage('图片生成失败，当前草稿仍保留。');
    } finally {
      setExporting(false);
    }
  }

  async function shareImageAction() {
    if (lastImage && lastImage.snapshot !== snapshot) {
      setShareChoiceOpen(true);
      return;
    }
    if (lastImage) {
      await shareImage(lastImage.dataUrl);
      return;
    }
    await shareNewImage();
  }

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-6 shadow-sm dark:border-cyan-900 dark:bg-cyan-950/20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            评分卡预览与 PNG 导出
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            预览、溢出检查和导出均使用当前游戏草稿快照。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            比例
            <select
              className="input mt-1"
              aria-label="比例"
              value={options.ratio}
              onChange={(e) =>
                setOptions((current) => ({ ...current, ratio: e.target.value as CardRatio }))
              }
            >
              {ALL_CARD_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                  {ratio === surfaceDefaults.ratio && surfaceDefaults.recommendation
                    ? `（${surfaceDefaults.recommendation}）`
                    : ''}
                </option>
              ))}
            </select>
            {surfaceDefaults.recommendation && (
              <span className="mt-1 block text-xs font-normal text-cyan-700 dark:text-cyan-300">
                {surfaceDefaults.ratio} · {surfaceDefaults.recommendation}
              </span>
            )}
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            主题
            <select
              className="input mt-1"
              value={options.theme}
              onChange={(e) =>
                setOptions((current) => ({
                  ...current,
                  theme: e.target.value as CardOptions['theme'],
                }))
              }
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl bg-slate-100 p-2 dark:bg-slate-950">
        <CardPreview
          cardRef={cardRef}
          draft={cardDraft}
          rating={rating}
          algorithmVersion={gameRatingAlgorithmVersion}
          options={options}
          onOverflowChange={setOverflow}
          onReadyChange={setReady}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="button-primary"
          onClick={() => void exportPng()}
          disabled={exporting || !ready}
        >
          {exporting ? '生成中…' : '生成并保存 PNG'}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void shareImageAction()}
          disabled={exporting || !ready}
        >
          分享评分卡
        </button>
        <span
          className="text-sm text-slate-600 dark:text-slate-300"
          role="status"
          aria-live="polite"
        >
          {message ||
            (overflow.hasOverflow
              ? '当前比例存在溢出风险。'
              : ready
                ? '当前比例检查通过。'
                : '正在准备预览…')}
        </span>
      </div>
      {shareChoiceOpen && (
        <div className="mt-4 rounded-xl border border-cyan-200 bg-white p-4 shadow-sm dark:border-cyan-800 dark:bg-slate-900">
          <p className="font-semibold text-slate-900 dark:text-white">
            评分内容已变更，选择要分享的图片
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            新图片会使用当前草稿重新生成；旧图片保留上一次已生成的内容。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="button-primary" onClick={() => void shareNewImage()}>
              生成新图片
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setShareChoiceOpen(false);
                setMessage('分享已取消，当前草稿和评分卡仍保留。');
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setShareChoiceOpen(false);
                if (lastImage) void shareImage(lastImage.dataUrl);
              }}
            >
              分享旧图片
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
