import { describe, expect, it } from 'vitest';
import {
  applyGameTemplate,
  copyGameTemplate,
  createSeededGameTemplateCatalog,
  deleteGameTemplate,
  renameGameTemplate,
} from './templateCatalog';

describe('game template catalog M1', () => {
  it('seeds four personal-rating templates and a standard blank template', () => {
    const catalog = createSeededGameTemplateCatalog();
    expect(catalog.templates).toHaveLength(5);
    expect(catalog.templates.map((template) => template.source)).toEqual([
      'seeded-example',
      'seeded-example',
      'seeded-example',
      'seeded-example',
      'seeded-example',
    ]);
    expect(catalog.templates.map((template) => template.rating.work.coverAssetPath)).toEqual([
      undefined,
      'assets/game-templates/covers/black-myth-wukong.webp',
      'assets/game-templates/covers/genshin-impact.webp',
      'assets/game-templates/covers/call-of-duty-4.webp',
      'assets/game-templates/covers/red-alert-2.webp',
    ]);
    expect(catalog.templates.map((template) => template.rating.work.releaseLabel)).toEqual([
      '工作室',
      '制作公司',
      '厂商',
      '工作室',
      '工作室',
    ]);
    expect(catalog.templates.map((template) => template.rating.work.platform)).toEqual([
      '',
      'PC / PS5 / Xbox Series X|S',
      'PC / PS4 / PS5 / iOS / Android',
      'PC / PS3 / Xbox 360 / Wii',
      'PC（Windows）',
    ]);
    expect(catalog.templates.map((template) => template.rating.work.version)).toEqual([
      '',
      '1.0 / 2024-08-20',
      '2.0 / 2021-08',
      '1.0 / 2007-11-06',
      '1.001 / 1.006',
    ]);
  });

  it('applies a deep copy so editing a rating cannot mutate the seed', () => {
    const template = createSeededGameTemplateCatalog().templates[1];
    const applied = applyGameTemplate(template);
    applied.work.title = '用户自己的游戏';
    applied.axes[0].score = 1;
    expect(template.rating.work.title).toBe('黑神话：悟空');
    expect(template.rating.axes[0].score).toBe(8);
  });

  it('keeps the Red Alert official worldview preset at 6 with level 2 weight', () => {
    const redAlert = createSeededGameTemplateCatalog().templates.find(
      (template) => template.id === 'game-example-long-title',
    );
    const worldview = redAlert?.rating.axes.find((axis) => axis.id === 'red-alert-world');
    expect(worldview).toMatchObject({ name: '官方剧情世界观', score: 6, importanceLevel: 2 });
  });

  it('copies, renames, and deletes without mutating the original catalog', () => {
    const catalog = createSeededGameTemplateCatalog();
    const source = catalog.templates[0];
    const copy = copyGameTemplate(source, 'user-copy-1', '2026-09-25T01:00:00.000Z');
    const withCopy = { ...catalog, templates: [...catalog.templates, copy] };
    const renamed = renameGameTemplate(
      withCopy,
      'user-copy-1',
      '我的红警模板',
      '2026-09-25T02:00:00.000Z',
    );
    const deleted = deleteGameTemplate(renamed, source.id);
    expect(copy.source).toBe('user-created');
    expect(renamed.templates.find((template) => template.id === 'user-copy-1')?.name).toBe(
      '我的红警模板',
    );
    expect(deleted.templates.some((template) => template.id === source.id)).toBe(false);
    expect(catalog.templates).toHaveLength(5);
  });

  it('rejects empty names and unknown ids', () => {
    const catalog = createSeededGameTemplateCatalog();
    expect(() => renameGameTemplate(catalog, catalog.templates[0].id, '  ')).toThrow(
      'template-name-required',
    );
    expect(() => deleteGameTemplate(catalog, 'missing')).toThrow('template-not-found');
  });
});
