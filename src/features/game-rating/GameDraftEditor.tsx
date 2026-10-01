import { useMemo } from 'react';

import { calculateGameRating } from '../../domain/game/calculateGameRating';
import type { ImportanceLevel, NegativeItem, RatingAxis } from '../../domain/rating/types';
import type { GameRatingDraft } from '../../domain/game/types';

interface GameDraftEditorProps {
  draft: GameRatingDraft;
  onChange: (next: GameRatingDraft) => void;
}

const importanceOptions: ImportanceLevel[] = [0, 1, 2, 3, 4, 5, 6];

function RequiredMark() {
  return (
    <span className="ml-0.5 text-rose-600" aria-hidden="true">
      *
    </span>
  );
}

function updateAxis(draft: GameRatingDraft, id: string, patch: Partial<RatingAxis>) {
  return {
    ...draft,
    axes: draft.axes.map((axis) => (axis.id === id ? { ...axis, ...patch } : axis)),
  };
}

function updateNegative(draft: GameRatingDraft, id: string, patch: Partial<NegativeItem>) {
  return {
    ...draft,
    negativeItems: draft.negativeItems.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

export function GameDraftEditor({ draft, onChange }: GameDraftEditorProps) {
  const rating = useMemo(() => calculateGameRating(draft), [draft]);

  function updateWork(
    field: 'title' | 'platform' | 'version' | 'releaseLabel' | 'releaseNote',
    value: string,
  ) {
    onChange({ ...draft, work: { ...draft.work, [field]: value } });
  }

  function addAxis() {
    const id = `game-axis-${Date.now().toString(36)}`;
    onChange({
      ...draft,
      axes: [
        ...draft.axes,
        { id, name: '新评价轴', score: 5, importanceLevel: 3, enabled: true, reason: '' },
      ],
    });
  }

  function addNegative() {
    const id = `game-negative-${Date.now().toString(36)}`;
    onChange({
      ...draft,
      negativeItems: [
        ...draft.negativeItems,
        { id, name: '新扣分项', score: -1, enabled: true, reason: '' },
      ],
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">当前作品副本</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              修改只作用于当前草稿，内置示例模板不会被覆盖。
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              <span className="text-rose-600" aria-hidden="true">
                *
              </span>{' '}
              为必填项
            </p>
          </div>
          <div className="rounded-xl bg-cyan-50 px-4 py-3 text-right dark:bg-cyan-950/50">
            <span className="block text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              综合分
            </span>
            <strong
              className="text-3xl tabular-nums text-cyan-800 dark:text-cyan-200"
              data-testid="game-aggregate-score"
            >
              {rating.status === 'ready' ? rating.score100.toFixed(1) : '—'}
            </strong>
            <span className="ml-1 text-sm text-cyan-700 dark:text-cyan-300">/100</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
            游戏名称
            <RequiredMark />
            <input
              className="input mt-1"
              value={draft.work.title}
              onChange={(e) => updateWork('title', e.target.value)}
              aria-label="游戏名称"
              aria-required="true"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            平台 / 设备（可选）
            <input
              className="input mt-1"
              value={draft.work.platform}
              onChange={(e) => updateWork('platform', e.target.value)}
              placeholder="PC / PS5 / Switch"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            版本 / 发售年份（可选）
            <input
              className="input mt-1"
              value={draft.work.version}
              onChange={(e) => updateWork('version', e.target.value)}
              placeholder="1.0 / 2024"
            />
          </label>
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[minmax(10rem,0.4fr)_minmax(0,1fr)]">
            <input
              className="input mt-1"
              value={draft.work.releaseLabel ?? '工作室'}
              onChange={(e) => updateWork('releaseLabel', e.target.value)}
              aria-label="发行信息标题"
              placeholder="工作室"
            />
            <input
              className="input mt-1"
              value={draft.work.releaseNote}
              onChange={(e) => updateWork('releaseNote', e.target.value)}
              aria-label="发行信息内容（可选）"
              placeholder="发行商、工作室或补充信息（可选）"
            />
          </div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            评分模式
            <RequiredMark />
            <select
              className="input mt-1"
              value={draft.mode}
              onChange={(e) =>
                onChange({ ...draft, mode: e.target.value as GameRatingDraft['mode'] })
              }
              aria-label="评分模式"
              aria-required="true"
            >
              <option value="simple">简易模式</option>
              <option value="professional">专业模式</option>
              <option value="custom">自定义模式</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">分项评分</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              评分范围 0–10；权重用于综合分。
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={addAxis}>
            添加评价轴
          </button>
        </div>
        <div className="mt-5 space-y-5">
          {draft.axes.map((axis, index) => (
            <div
              key={axis.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-40 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  评价轴 {index + 1}
                  <RequiredMark />
                  <input
                    className="input mt-1"
                    value={axis.name}
                    onChange={(e) => onChange(updateAxis(draft, axis.id, { name: e.target.value }))}
                    aria-label={`评价轴 ${index + 1}`}
                    aria-required="true"
                  />
                </label>
                <label className="w-28 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  权重
                  <RequiredMark />
                  <select
                    className="input mt-1"
                    value={axis.importanceLevel}
                    onChange={(e) =>
                      onChange(
                        updateAxis(draft, axis.id, {
                          importanceLevel: Number(e.target.value) as ImportanceLevel,
                        }),
                      )
                    }
                    aria-label={`${axis.name}权重`}
                    aria-required="true"
                  >
                    {importanceOptions.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="button-secondary text-rose-700"
                  disabled={draft.axes.length <= 1}
                  onClick={() =>
                    onChange({ ...draft, axes: draft.axes.filter((item) => item.id !== axis.id) })
                  }
                >
                  删除
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  className="w-full accent-cyan-600"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={axis.score}
                  onChange={(e) =>
                    onChange(updateAxis(draft, axis.id, { score: Number(e.target.value) }))
                  }
                  aria-label={`${axis.name}分数`}
                  aria-required="true"
                />
                <output className="w-12 text-right font-bold tabular-nums text-cyan-700 dark:text-cyan-300">
                  {axis.score}/10
                </output>
              </div>
              <label className="mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                分项理由（可选）
                <textarea
                  className="input mt-1 min-h-20"
                  value={axis.reason}
                  onChange={(e) => onChange(updateAxis(draft, axis.id, { reason: e.target.value }))}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">扣分项（可选）</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              直接填写百分制扣分：-3 表示从综合分扣 3 分，最终分数最低为 0。
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={addNegative}>
            添加扣分项
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {draft.negativeItems.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              暂未添加扣分项。
            </p>
          )}
          {draft.negativeItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-40 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  扣分项名称
                  <RequiredMark />
                  <input
                    className="input mt-1"
                    value={item.name}
                    onChange={(e) =>
                      onChange(updateNegative(draft, item.id, { name: e.target.value }))
                    }
                    aria-label="扣分项名称"
                    aria-required="true"
                  />
                </label>
                <label className="w-28 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  扣分
                  <RequiredMark />
                  <input
                    className="input mt-1"
                    type="number"
                    min="-10"
                    max="0"
                    step="1"
                    value={item.score}
                    onChange={(e) =>
                      onChange(
                        updateNegative(draft, item.id, {
                          score: Math.max(-10, Math.min(0, Number(e.target.value) || 0)),
                        }),
                      )
                    }
                    aria-label="扣分"
                    aria-required="true"
                  />
                </label>
                <button
                  type="button"
                  className="button-secondary text-rose-700"
                  onClick={() =>
                    onChange({
                      ...draft,
                      negativeItems: draft.negativeItems.filter((entry) => entry.id !== item.id),
                    })
                  }
                >
                  删除
                </button>
              </div>
              <textarea
                className="input mt-3 min-h-20"
                value={item.reason}
                onChange={(e) =>
                  onChange(updateNegative(draft, item.id, { reason: e.target.value }))
                }
                placeholder="扣分理由（可选）"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">文字评价</h3>
        <div className="mt-4 grid gap-4">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            总体评价
            <textarea
              className="input mt-1 min-h-24"
              value={draft.overallComment}
              onChange={(e) => onChange({ ...draft, overallComment: e.target.value })}
              placeholder="写下对这款游戏的总体评价"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            个人故事
            <textarea
              className="input mt-1 min-h-24"
              value={draft.personalStory}
              onChange={(e) => onChange({ ...draft, personalStory: e.target.value })}
              placeholder="可选：记录与你和这款游戏有关的故事"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            个人签名档（可选）
            <input
              className="input mt-1"
              value={draft.personalSignature ?? ''}
              onChange={(e) => onChange({ ...draft, personalSignature: e.target.value })}
              placeholder="导出时显示的署名"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
