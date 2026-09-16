import { test, expect, type Page } from '@playwright/test';
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.name));
});
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page) ?? [], 'No unhandled browser exception').toEqual([]); });

async function enterJournal(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'DEV: Misafir görünümü' }).click();
  await page.getByRole('button', { name: 'Günlük', exact: true }).filter({ visible: true }).first().click();
  await expect(page.locator('.journal-notebook')).toBeVisible();
  await page.getByRole('button', { name: /Hızlı Kayıt/ }).click();
}

test('unsaved last character survives navigation away and back', async ({ page }) => {
  await enterJournal(page);
  const text = `Kaydedilmemiş taslak ${Date.now()} son harf!`;
  await page.locator('.journal-quick-entry textarea').fill(text);
  // Navigate before the 600ms debounce fires: the unmount flush must protect it.
  await page.getByRole('button', { name: 'Odaklanma', exact: true }).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: 'Odak ekranını küçült' }).click();
  await page.getByRole('button', { name: 'Günlük', exact: true }).filter({ visible: true }).first().click();
  await expect(page.locator('.journal-quick-entry textarea')).toHaveValue(text);
  await expect(page.getByText('Sunucuya kaydedildi', { exact: true })).toHaveCount(0);
});

test('unsaved draft survives a reload and retains separate morning/evening text', async ({ page }) => {
  await enterJournal(page);
  await page.getByRole('button', { name: /Sabah Niyeti/ }).click();
  await page.locator('.journal-quick-entry textarea').fill('Sabah taslağım');
  await page.getByRole('button', { name: /Akşam Muhasebesi/ }).click();
  await page.locator('.journal-quick-entry textarea').fill('Akşam taslağım');
  await page.reload();
  await page.getByRole('button', { name: 'DEV: Misafir görünümü' }).click();
  await page.getByRole('button', { name: 'Günlük', exact: true }).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /Akşam Muhasebesi/ }).click();
  await expect(page.locator('.journal-quick-entry textarea')).toHaveValue('Akşam taslağım');
  await page.getByRole('button', { name: /Sabah Niyeti/ }).click();
  await expect(page.locator('.journal-quick-entry textarea')).toHaveValue('Sabah taslağım');
});
