import { useEffect, useMemo, useState } from 'react';

import blackMythCover from '../../../assets/game-templates/covers/black-myth-wukong.webp';
import callOfDutyCover from '../../../assets/game-templates/covers/call-of-duty-4.webp';
import genshinCover from '../../../assets/game-templates/covers/genshin-impact.webp';
import redAlertCover from '../../../assets/game-templates/covers/red-alert-2.webp';
import {
  applyGameTemplate,
  copyGameTemplate,
  deleteGameTemplate,
  renameGameTemplate,
  restoreSeededGameTemplates,
} from '../../domain/game/templateCatalog';
import {
  initializeGameTemplateCatalog,
  saveGameTemplateCatalog,
  type GameTemplateStorageLike,
} from '../../domain/game/templateStorage';
import type { GameRatingDraft, GameTemplateDefinition } from '../../domain/game/types';
import { GameDraftEditor } from './GameDraftEditor';
import { GameCardExport } from './GameCardExport';
import type { GameCardSurface } from './gameCardSurface';

const GAME_DRAFT_KEY = 'xdrate.games.current-draft.v1';
const DEFAULT_TEMPLATE_ID = 'game-example-score-distribution';

const coverAssets: Record<string, string> = {
  'assets/game-templates/covers/red-alert-2.webp': redAlertCover,
  'assets/game-templates/covers/call-of-duty-4.webp': callOfDutyCover,
  'assets/game-templates/covers/genshin-impact.webp': genshinCover,
  'assets/game-templates/covers/black-myth-wukong.webp': blackMythCover,
};

function getStorage(): GameTemplateStorageLike {
  return window.localStorage;
}

function createUserTemplateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `game-user-${crypto.randomUUID()}`;
  }
  return `game-user-${Date.now().toString(36)}`;
}

function initialCatalog() {
  const loaded = initializeGameTemplateCatalog(getStorage());
  const metadataById: Record<
    string,
    {
      platform: string;
      version: string;
      legacyVersions: string[];
      releaseLabel: string;
      releaseNote: string;
      extraFields: { id: string; label: string; value: string }[];
    }
  > = {
    'game-example-score-distribution': {
      platform: 'PC / PS5 / Xbox Series X|S',
      version: '1.0 / 2024',
      legacyVersions: ['1.0 / 2024'],
      releaseLabel: '制作公司',
      releaseNote: '游戏科学（Game Science）',
      extraFields: [
        { id: 'wukong-publisher', label: '发行商', value: '游戏科学（Game Science）' },
        { id: 'wukong-genre', label: '类型', value: '动作角色扮演' },
      ],
    },
    'game-example-long-reason': {
      platform: 'PC / PS4 / PS5 / iOS / Android',
      version: '2.0 / 2021-08',
      legacyVersions: ['1.0 / 2020', '1.0 / 2020-09-28'],
      releaseLabel: '厂商',
      releaseNote: '米哈游 · HoYoverse',
      extraFields: [
        { id: 'genshin-publisher', label: '发行商', value: 'HoYoverse' },
        { id: 'genshin-genre', label: '类型', value: '开放世界 · 动作角色扮演' },
      ],
    },
    'game-example-platform-version': {
      platform: 'PC / PS3 / Xbox 360 / Wii',
      version: '1.0 / 2007',
      legacyVersions: ['1.0 / 2007'],
      releaseLabel: '工作室',
      releaseNote: 'Infinity Ward',
      extraFields: [
        { id: 'cod4-publisher', label: '发行商', value: 'Activision' },
        { id: 'cod4-ds-developer', label: '掌机版开发', value: 'n-Space（Nintendo DS）' },
      ],
    },
    'game-example-long-title': {
      platform: 'PC（Windows）',
      version: '1.001 / 1.006',
      legacyVersions: ['1.0 / 2000', '1.0 / 2000-10-26'],
      releaseLabel: '工作室',
      releaseNote: 'Westwood Studios',
      extraFields: [
        { id: 'red-alert-publisher', label: '发行商', value: 'Electronic Arts（EA）' },
        { id: 'red-alert-genre', label: '类型', value: '即时战略' },
      ],
    },
  };
  const seededOrder = [
    'game-example-blank',
    'game-example-score-distribution',
    'game-example-long-reason',
    'game-example-platform-version',
    'game-example-long-title',
  ];
  const templates = loaded.catalog.templates
    .map((template) => {
      const metadata = template.source === 'seeded-example' ? metadataById[template.id] : undefined;
      if (!metadata) return template;
      return {
        ...template,
        rating: {
          ...template.rating,
          work: {
            ...template.rating.work,
            platform: template.rating.work.platform || metadata.platform,
            version:
              !template.rating.work.version ||
              metadata.legacyVersions.includes(template.rating.work.version)
                ? metadata.version
                : template.rating.work.version,
            releaseLabel:
              !template.rating.work.releaseLabel ||
              (template.rating.work.releaseLabel === '工作室' && metadata.releaseLabel !== '工作室')
                ? metadata.releaseLabel
                : template.rating.work.releaseLabel,
            releaseNote: template.rating.work.releaseNote || metadata.releaseNote,
            extraFields:
              template.rating.work.extraFields.length > 0
                ? template.rating.work.extraFields
                : metadata.extraFields,
          },
        },
      };
    })
    .sort((left, right) => {
      const leftRank = seededOrder.indexOf(left.id);
      const rightRank = seededOrder.indexOf(right.id);
      if (leftRank === -1 && rightRank === -1) return 0;
      if (leftRank === -1) return 1;
      if (rightRank === -1) return -1;
      return leftRank - rightRank;
    });
  const catalog = { ...loaded.catalog, templates };
  if (JSON.stringify(catalog) !== JSON.stringify(loaded.catalog)) {
    saveGameTemplateCatalog(getStorage(), catalog);
  }
  return { ...loaded, catalog };
}

function loadSavedDraft(): GameRatingDraft | null {
  try {
    const raw = window.localStorage.getItem(GAME_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameRatingDraft>;
    if (!parsed.work || !Array.isArray(parsed.axes) || !Array.isArray(parsed.negativeItems)) {
      return null;
    }
    return parsed as GameRatingDraft;
  } catch {
    return null;
  }
}

export function GameRatingPilot({ cardSurface = 'browser' }: { cardSurface?: GameCardSurface }) {
  const loaded = useMemo(() => initialCatalog(), []);
  const [catalog, setCatalog] = useState(loaded.catalog);
  const defaultTemplate = catalog.templates.find((template) => template.id === DEFAULT_TEMPLATE_ID);
  const [selectedId, setSelectedId] = useState(
    defaultTemplate?.id ?? catalog.templates[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<GameRatingDraft | null>(() => {
    const saved = loadSavedDraft();
    return saved ?? (defaultTemplate ? applyGameTemplate(defaultTemplate) : null);
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [notice, setNotice] = useState(
    loaded.status === 'seeded'
      ? '已创建四个游戏示例模板和一个标准空白模板。示例模板是作者个人评价，不代表官方结论。'
      : loaded.status === 'migrated'
        ? '已升级旧版 Toy 模板缓存，并补回缺失的内置模板；个人模板保持不变。'
        : loaded.status === 'recovered'
          ? '旧版模板缓存无法安全读取，已恢复五个内置模板。'
          : loaded.status === 'unavailable'
            ? '本地模板存储不可用；五个内置模板仍可使用，但修改只保留在本次页面会话中。'
            : '已恢复本地游戏模板。',
  );

  useEffect(() => {
    if (!draft) return;
    try {
      window.localStorage.setItem(GAME_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // The editor remains usable when the host blocks local storage.
    }
  }, [draft]);

  function selectTemplate(template: GameTemplateDefinition) {
    setSelectedId(template.id);
    setDraft(applyGameTemplate(template));
    setNotice(`已载入“${template.name}”。这是个人评价示例，可继续编辑。`);
  }

  function persist(nextCatalog: typeof catalog, message: string) {
    setCatalog(nextCatalog);
    const result = saveGameTemplateCatalog(getStorage(), nextCatalog);
    setNotice(
      result === 'saved' ? message : '模板已更新，但本地存储不可用，本次修改只保留在当前页面。',
    );
  }

  function copyTemplate(template: GameTemplateDefinition) {
    const copy = copyGameTemplate(template, createUserTemplateId());
    persist(
      { ...catalog, templates: [...catalog.templates, copy] },
      `已复制“${template.name}”，现在可以作为个人模板修改。`,
    );
    selectTemplate(copy);
  }

  function beginRename(template: GameTemplateDefinition) {
    setEditingId(template.id);
    setEditingName(template.name);
  }

  function commitRename(template: GameTemplateDefinition) {
    try {
      persist(renameGameTemplate(catalog, template.id, editingName), '模板名称已更新。');
      setEditingId(null);
    } catch {
      setNotice('模板名称不能为空。');
    }
  }

  function removeTemplate(template: GameTemplateDefinition) {
    if (!window.confirm(`确定删除“${template.name}”吗？这不会删除当前作品。`)) return;
    const nextCatalog = deleteGameTemplate(catalog, template.id);
    persist(nextCatalog, '模板已删除，当前作品不会受到影响。');
    if (selectedId === template.id) {
      const next = nextCatalog.templates[0];
      setSelectedId(next?.id ?? null);
      setDraft(next ? applyGameTemplate(next) : null);
    }
  }

  function restoreBuiltInTemplates() {
    const restored = restoreSeededGameTemplates(catalog);
    const restoredCount = restored.templates.length - catalog.templates.length;
    if (restoredCount === 0) {
      setNotice('五个内置模板均已存在，无需恢复。');
      return;
    }
    persist(restored, `已恢复 ${restoredCount} 个缺失的内置模板；你的个人模板保持不变。`);
    const preferred = restored.templates.find((template) => template.id === DEFAULT_TEMPLATE_ID);
    if (!selectedId && preferred) setSelectedId(preferred.id);
  }

  const selectedTemplate = catalog.templates.find((template) => template.id === selectedId) ?? null;

  return (
    <section className="mt-8 space-y-6" aria-labelledby="game-pilot-title">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 dark:border-cyan-900 dark:bg-cyan-950/40">
        <p className="text-sm font-semibold tracking-wide text-cyan-700 dark:text-cyan-300">
          XDRATE · GAME PILOT 0.5.0
        </p>
        <h2
          id="game-pilot-title"
          className="mt-2 text-2xl font-bold text-slate-950 dark:text-white"
        >
          游戏评分试验
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700 dark:text-slate-300">
          这里提供少量带封面的作者个人评价模板，用于验证游戏领域字段、评分轴和卡片排版。
          模板可以套用、复制、改名或删除，不代表官方评分、排行榜或平台推荐。
        </p>
        <p
          className="mt-3 text-sm text-slate-600 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">游戏模板</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              点击图标查看详情；默认从黑神话：悟空开始。标准空白模板用于清空到最基础的自定义状态。
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-xs text-slate-400">{catalog.templates.length} 个模板</span>
            <button
              type="button"
              className="button-secondary px-3 py-1.5 text-xs"
              onClick={restoreBuiltInTemplates}
            >
              恢复内置模板
            </button>
          </div>
        </div>
        <div
          className="mt-4 flex snap-x gap-3 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x"
          role="list"
          aria-label="游戏模板"
        >
          {catalog.templates.map((template) => {
            const cover = template.rating.work.coverAssetPath
              ? coverAssets[template.rating.work.coverAssetPath]
              : undefined;
            const selected = template.id === selectedId;
            return (
              <button
                key={template.id}
                type="button"
                role="listitem"
                aria-pressed={selected}
                aria-label={`查看模板：${template.name}`}
                className={`group shrink-0 snap-start rounded-2xl border p-1 transition ${
                  selected
                    ? 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-900'
                    : 'border-slate-200 hover:border-cyan-300 dark:border-slate-700'
                }`}
                onClick={() => setSelectedId(template.id)}
              >
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20"
                  />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-xl bg-slate-100 text-xs text-slate-500 sm:h-20 sm:w-20 dark:bg-slate-800 dark:text-slate-400">
                    {template.id === 'game-example-blank' ? '空白' : '无封面'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedTemplate && (
          <article className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                  {selectedTemplate.source === 'seeded-example'
                    ? '示例模板 / 个人评价'
                    : '我的模板'}
                </span>
                {editingId === selectedTemplate.id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input min-w-0"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      aria-label="模板名称"
                    />
                    <button
                      type="button"
                      className="button-primary shrink-0 px-3"
                      onClick={() => commitRename(selectedTemplate)}
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
                    {selectedTemplate.name}
                  </h3>
                )}
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {selectedTemplate.rating.mode === 'professional'
                    ? '专业模式'
                    : selectedTemplate.rating.mode === 'custom'
                      ? '自定义模式'
                      : '简易模式'}{' '}
                  · {selectedTemplate.rating.axes.length} 个评价轴 ·{' '}
                  {selectedTemplate.rating.work.platform || '平台未填写'}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedTemplate.rating.work.version || '版本未填写'} ·{' '}
                  {selectedTemplate.rating.work.releaseLabel || '工作室'}：
                  {selectedTemplate.rating.work.releaseNote || '未填写'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => selectTemplate(selectedTemplate)}
                >
                  套用
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => copyTemplate(selectedTemplate)}
                >
                  复制为我的模板
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => beginRename(selectedTemplate)}
                >
                  改名
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300"
                  onClick={() => removeTemplate(selectedTemplate)}
                >
                  删除
                </button>
              </div>
            </div>
          </article>
        )}
      </section>

      {draft ? (
        <>
          <GameDraftEditor draft={draft} onChange={setDraft} />
          <GameCardExport draft={draft} surface={cardSurface} />
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          暂未套用模板，请先选择一个游戏模板。
        </div>
      )}
    </section>
  );
}
