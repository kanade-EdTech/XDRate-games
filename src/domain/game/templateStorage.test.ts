import { describe, expect, it } from 'vitest';
import {
  GAME_TEMPLATE_CATALOG_KEY,
  initializeGameTemplateCatalog,
  loadGameTemplateCatalog,
  saveGameTemplateCatalog,
  type GameTemplateStorageLike,
} from './templateStorage';
import { deleteGameTemplate, restoreSeededGameTemplates } from './templateCatalog';

function memoryStorage(): GameTemplateStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

describe('game template storage M1', () => {
  it('seeds once and restores the user-editable catalog', () => {
    const storage = memoryStorage();
    const first = initializeGameTemplateCatalog(storage, '2026-09-25T03:00:00.000Z');
    expect(first.status).toBe('seeded');
    expect(first.catalog.version).toBe(2);
    expect(first.catalog.templates).toHaveLength(5);

    const second = initializeGameTemplateCatalog(storage, '2026-09-26T03:00:00.000Z');
    expect(second.status).toBe('restored');
    expect(second.catalog.templates[0].createdAt).toBe('2026-09-25T03:00:00.000Z');
  });

  it('preserves template storage independently of workspace clearing', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage);
    storage.setItem('xdrate.game.workspace.v1', JSON.stringify({ title: '用户作品' }));
    storage.removeItem?.('xdrate.game.workspace.v1');
    const restored = loadGameTemplateCatalog(storage);
    expect(restored.status).toBe('restored');
    expect(restored.catalog.templates).toEqual(seeded.catalog.templates);
    expect(storage.data.has(GAME_TEMPLATE_CATALOG_KEY)).toBe(true);
  });

  it('rejects duplicate template ids or names', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage).catalog;
    const duplicate = {
      ...seeded,
      templates: [...seeded.templates, { ...seeded.templates[0], id: 'another-id' }],
    };
    expect(saveGameTemplateCatalog(storage, duplicate)).toBe('invalid');
  });

  it('does not trust malformed persisted data', () => {
    const storage = memoryStorage();
    storage.setItem(GAME_TEMPLATE_CATALOG_KEY, '{"version":2,"templates":[null]}');
    expect(loadGameTemplateCatalog(storage).status).toBe('invalid');
  });

  it('migrates a partial v1 Toy cache and restores missing built-ins once', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage).catalog;
    const blankOnly = { version: 1, templates: [seeded.templates[0]] };
    storage.setItem(GAME_TEMPLATE_CATALOG_KEY, JSON.stringify(blankOnly));

    const migrated = initializeGameTemplateCatalog(storage);
    expect(migrated.status).toBe('migrated');
    expect(migrated.catalog.version).toBe(2);
    expect(migrated.catalog.templates).toHaveLength(5);
    expect(JSON.parse(storage.data.get(GAME_TEMPLATE_CATALOG_KEY) ?? '{}').version).toBe(2);

    const deleted = deleteGameTemplate(migrated.catalog, migrated.catalog.templates[1].id);
    saveGameTemplateCatalog(storage, deleted);
    const restoredV2 = initializeGameTemplateCatalog(storage);
    expect(restoredV2.status).toBe('restored');
    expect(restoredV2.catalog.templates).toHaveLength(4);
  });

  it('refreshes the built-in Red Alert worldview default from the source catalog', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage).catalog;
    const redAlert = seeded.templates.find((template) => template.id === 'game-example-long-title');
    if (!redAlert) throw new Error('Red Alert template missing');
    const legacy = {
      ...seeded,
      templates: seeded.templates.map((template) =>
        template.id === redAlert.id
          ? {
              ...template,
              rating: {
                ...template.rating,
                axes: template.rating.axes.map((axis) =>
                  axis.id === 'red-alert-world' ? { ...axis, score: 6, reason: '' } : axis,
                ),
              },
            }
          : template,
      ),
    };
    storage.setItem(GAME_TEMPLATE_CATALOG_KEY, JSON.stringify(legacy));

    const migrated = initializeGameTemplateCatalog(storage);
    const worldview = migrated.catalog.templates
      .find((template) => template.id === redAlert.id)
      ?.rating.axes.find((axis) => axis.id === 'red-alert-world');
    expect(migrated.status).toBe('migrated');
    expect(worldview).toMatchObject({ score: 5, reason: '无厘头剧情毁童年' });

    const staleBuiltIn = {
      ...migrated.catalog,
      templates: migrated.catalog.templates.map((template) =>
        template.id === redAlert.id
          ? {
              ...template,
              rating: {
                ...template.rating,
                axes: template.rating.axes.map((axis) =>
                  axis.id === 'red-alert-world' ? { ...axis, score: 6, reason: '用户自定义' } : axis,
                ),
              },
            }
          : template,
      ),
    };
    storage.setItem(GAME_TEMPLATE_CATALOG_KEY, JSON.stringify(staleBuiltIn));
    const refreshed = initializeGameTemplateCatalog(storage);
    const refreshedWorldview = refreshed.catalog.templates
      .find((template) => template.id === redAlert.id)
      ?.rating.axes.find((axis) => axis.id === 'red-alert-world');
    expect(refreshed.status).toBe('migrated');
    expect(refreshedWorldview).toMatchObject({
      score: 5,
      importanceLevel: 2,
      reason: '无厘头剧情毁童年',
    });
  });

  it('keeps built-ins available in memory when Toy storage is blocked', () => {
    const blocked: GameTemplateStorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const result = initializeGameTemplateCatalog(blocked);
    expect(result.status).toBe('unavailable');
    expect(result.catalog.templates).toHaveLength(5);
  });

  it('restores deleted built-ins without removing user templates', () => {
    const storage = memoryStorage();
    const seeded = initializeGameTemplateCatalog(storage).catalog;
    const userTemplate = {
      ...seeded.templates[1],
      id: 'game-user-kept',
      source: 'user-created' as const,
      name: '我的保留模板',
    };
    const partial = {
      ...deleteGameTemplate(seeded, seeded.templates[1].id),
      templates: [...deleteGameTemplate(seeded, seeded.templates[1].id).templates, userTemplate],
    };
    const restored = restoreSeededGameTemplates(partial);
    expect(restored.templates).toHaveLength(6);
    expect(restored.templates.some((template) => template.id === 'game-user-kept')).toBe(true);
    expect(restored.templates.some((template) => template.id === seeded.templates[1].id)).toBe(
      true,
    );
  });
});
