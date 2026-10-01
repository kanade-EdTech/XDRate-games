import { expect, test, type Page } from '@playwright/test';

const ALL_RATIOS = ['16:9', '8:5', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '5:8', '9:16'];

interface GeometryAudit {
  collisions: Array<{ first: string; second: string; width: number; height: number }>;
  outOfBounds: string[];
  scrollOverflow: string[];
}

async function inspectCardGeometry(page: Page): Promise<GeometryAudit> {
  return page.locator('[data-card-region="card"]').evaluate((card) => {
    const tolerance = 1.5;
    const cardRect = card.getBoundingClientRect();
    const elements = Array.from(card.querySelectorAll<HTMLElement>('[data-card-region]')).filter(
      (element) => {
        const rect = element.getBoundingClientRect();
        return element.dataset.cardRegion !== 'card' && rect.width > 0 && rect.height > 0;
      },
    );
    const entries = elements.map((element) => ({
      element,
      region: element.dataset.cardRegion ?? 'unknown',
      rect: element.getBoundingClientRect(),
    }));
    const collisions: GeometryAudit['collisions'] = [];

    entries.forEach((first, firstIndex) => {
      entries.slice(firstIndex + 1).forEach((second) => {
        if (first.element.contains(second.element) || second.element.contains(first.element))
          return;
        const width =
          Math.min(first.rect.right, second.rect.right) -
          Math.max(first.rect.left, second.rect.left);
        const height =
          Math.min(first.rect.bottom, second.rect.bottom) -
          Math.max(first.rect.top, second.rect.top);
        if (width > tolerance && height > tolerance) {
          collisions.push({ first: first.region, second: second.region, width, height });
        }
      });
    });

    return {
      collisions,
      outOfBounds: entries
        .filter(
          ({ rect }) =>
            rect.left < cardRect.left - tolerance ||
            rect.top < cardRect.top - tolerance ||
            rect.right > cardRect.right + tolerance ||
            rect.bottom > cardRect.bottom + tolerance,
        )
        .map(({ region }) => region),
      scrollOverflow: [card as HTMLElement, ...elements]
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth + tolerance ||
            element.scrollHeight > element.clientHeight + tolerance,
        )
        .map((element) => element.dataset.cardRegion ?? 'card'),
    };
  });
}

async function expectAllRatiosWithoutOverlap(page: Page, requireOverflowPass: boolean) {
  const ratioSelect = page.getByRole('combobox', { name: '比例', exact: true });
  const card = page.locator('[data-card-region="card"]');
  await expect(card).toHaveAttribute('data-layout-engine', 'v1');

  for (const ratio of ALL_RATIOS) {
    await ratioSelect.selectOption(ratio);
    await expect(ratioSelect).toHaveValue(ratio);
    await expect(card).toHaveAttribute('data-layout-family', /landscape|standard|square|portrait/);
    await page.waitForTimeout(180);

    const audit = await inspectCardGeometry(page);
    expect(audit.collisions, `${ratio} has overlapping card regions`).toEqual([]);
    expect(audit.outOfBounds, `${ratio} has card regions outside the logical canvas`).toEqual([]);
    if (requireOverflowPass) {
      expect(audit.scrollOverflow, `${ratio} has overflowing card regions`).toEqual([]);
      await expect(page.getByText('当前比例检查通过。')).toBeVisible();
    }
  }
}

test('game Toy shell and template editor render without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('XDRATE GAMES', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '游戏评分试验' })).toBeVisible();
  await expect(page.getByText('黑神话：悟空 · 个人评价')).toBeVisible();
  await expect(page.getByLabel('游戏名称')).toHaveValue('黑神话：悟空');
  await expect(page.getByLabel('平台 / 设备（可选）')).toHaveValue('PC / PS5 / Xbox Series X|S');
  await expect(page.getByLabel('发行信息标题')).toHaveValue('制作公司');
  await expect(page.getByLabel('游戏模板').getByRole('listitem')).toHaveCount(5);

  const ratioSelect = page.getByLabel('比例');
  await expect(ratioSelect.locator('option')).toHaveCount(11);
  await expect(ratioSelect).toHaveValue('1:1');
  await expect(ratioSelect.locator('option[value="1:1"]')).toHaveText('1:1（B站动态推荐）');
  await expect(page.getByText('1:1 · B站动态推荐')).toBeVisible();
  await ratioSelect.selectOption('1:1');
  await expect(page.getByText('当前比例检查通过。')).toBeVisible();

  const viewport = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(viewport.width).toBeLessThanOrEqual(viewport.client + 1);
});

test('standard blank template clears to the minimal custom state without changing the default', async ({
  page,
}) => {
  await page.goto('/');
  const templates = page.getByLabel('游戏模板');
  await expect(page.getByLabel('游戏名称')).toHaveValue('黑神话：悟空');
  await templates.getByRole('listitem').first().click();
  await expect(page.getByRole('heading', { name: '标准空白模板' })).toBeVisible();
  await page.getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByLabel('游戏名称')).toHaveValue('');
  await expect(page.getByLabel('评分模式')).toHaveValue('custom');
  await expect(page.getByRole('button', { name: '添加评价轴' })).toBeVisible();
  await expect(page.getByLabel('评价轴 1')).toHaveCount(0);
  await expect(page.getByLabel('游戏模板').getByRole('listitem').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('game Toy keeps draft after reload and exposes save/share actions', async ({ page }) => {
  await page.goto('/');
  const title = page.getByLabel('游戏名称');
  await title.fill('验收用游戏');
  await page.reload();
  await expect(page.getByLabel('游戏名称')).toHaveValue('验收用游戏');
  await expect(page.getByRole('button', { name: '生成并保存 PNG' })).toBeVisible();
  await expect(page.getByRole('button', { name: '分享评分卡' })).toBeVisible();
});

test('migrates a partial legacy Toy template cache without losing choices', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const key = 'xdrate.game.templates.v1';
    const catalog = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      version: number;
      templates: Array<{ id: string }>;
    };
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        templates: catalog.templates.filter((template) => template.id === 'game-example-blank'),
      }),
    );
  });
  await page.reload();
  await expect(page.getByLabel('游戏模板').getByRole('listitem')).toHaveCount(5);
  await expect(page.getByText(/已升级旧版 Toy 模板缓存/)).toBeVisible();
});

test('LayoutEngine keeps the default 9-axis card collision-free in all 11 ratios', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('评价轴 9')).toBeVisible();
  await expectAllRatiosWithoutOverlap(page, true);
});

test('LayoutEngine keeps a dense 12-axis long-text card collision-free in all 11 ratios', async ({
  page,
}) => {
  await page.goto('/');
  const addAxis = page.getByRole('button', { name: '添加评价轴' });
  await addAxis.click();
  await addAxis.click();
  await addAxis.click();
  await expect(page.getByLabel('评价轴 12')).toBeVisible();

  const scoringSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: '分项评分' }),
  });
  const reasons = scoringSection.locator('textarea');
  for (let index = 0; index < (await reasons.count()); index += 1) {
    await reasons
      .nth(index)
      .fill(
        `第 ${index + 1} 项的长理由，用于验证密集内容在所有图片比例中只会安全截断，不会互相重合。`,
      );
  }

  await page
    .locator('label')
    .filter({ hasText: '总体评价' })
    .locator('textarea')
    .fill('这是一段用于 LayoutEngine 压力回归的总体评价。'.repeat(20));
  await page
    .locator('label')
    .filter({ hasText: '个人故事' })
    .locator('textarea')
    .fill('这是一段用于验证竖版和横版安全排布的个人故事。'.repeat(20));
  await page.getByPlaceholder('导出时显示的署名').fill('XDRate Games · LayoutEngine regression');

  await expectAllRatiosWithoutOverlap(page, false);
});
