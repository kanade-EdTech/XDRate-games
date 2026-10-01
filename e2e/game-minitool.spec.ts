import { expect, test } from '@playwright/test';

test('game MiniTool defaults to the Xiaohongshu recommended 3:4 ratio', async ({ page }) => {
  await page.goto('/');
  const ratioSelect = page.getByRole('combobox', { name: '比例', exact: true });

  await expect(ratioSelect.locator('option')).toHaveCount(11);
  await expect(ratioSelect).toHaveValue('3:4');
  await expect(ratioSelect.locator('option[value="3:4"]')).toHaveText('3:4（小红书推荐）');
  await expect(page.getByText('3:4 · 小红书推荐')).toBeVisible();

  await ratioSelect.selectOption('1:1');
  await expect(ratioSelect).toHaveValue('1:1');
});
