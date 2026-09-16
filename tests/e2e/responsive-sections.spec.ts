import { test, expect } from '@playwright/test';

test('seven main sections render at 375px with reduced motion and usable navigation', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.goto('/');
  await page.getByRole('button', { name: 'DEV: Misafir görünümü' }).click();
  await expect(page.locator('[data-growth-scene]')).toBeVisible();
  for (const [view, selector] of [['journal', '.journal-notebook'], ['quran-companion', '.quran-companion'], ['mescidim', '.mescidim-main-tabs'], ['awareness', '.awareness-experience'], ['reports', '.report-next-step'], ['profession-school', '.profession-school'], ['focus', '.focus-shell']]) {
    await page.evaluate(view => window.history.pushState(null, '', `/?view=${view}`), view);
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('.view-motion-shell')).toHaveCSS('opacity', '1');
    await expect(page.locator('.view-motion-shell h1, .view-motion-shell h2, .focus-dial').first()).toBeVisible();
    await expect(page.getByText('Bu bölüm şu anda görüntülenemiyor.')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), view).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${view}-375.png`) });
    const smallNav = await page.locator('.mobile-nav button, .quran-companion-tabs button, .journal-hub-tabs button, .mescidim-main-tabs button').evaluateAll(buttons => buttons.filter(button => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    }).map(button => button.textContent?.trim()));
    expect(smallNav, `${view}: primary tabs/navigation >=44px`).toEqual([]);
    if (view === 'focus') {
      await expect(page.locator('.focus-side-panel')).toHaveCount(0);
      await expect(page.locator('.focus-timeline-toggle')).toHaveAttribute('aria-expanded', 'false');
      await page.locator('.focus-timeline-toggle').click();
      await expect(page.locator('.focus-side-panel')).toBeVisible();
      await page.locator('.focus-side-close').click();
      await expect(page.locator('.focus-side-panel')).toHaveCount(0);
    } else {
      await expect(page.locator('.global-search-button .app-icon')).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test('journal, Quran and mosque subtabs remain usable at 375px', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=journal');
  await page.getByRole('button', { name: 'DEV: Misafir görünümü' }).click();
  for (const [view, tabs, selector] of [
    ['journal', ['journal', 'matrix', 'sukur', 'lessons'], '.journal-hub-tabs button.active'],
    ['quran-companion', ['home', 'wheel', 'teachers', 'appointments', 'peers', 'study'], '.quran-companion-tabs button.active'],
    ['mescidim', ['vakitler', 'asma', 'dua'], '.mescidim-main-tabs button.active'],
  ] as const) {
    for (const tab of tabs) {
      await page.evaluate(({ view, tab }) => window.history.pushState(null, '', `/?view=${view}&tab=${tab}`), { view, tab });
      await expect(page.locator(selector)).toBeVisible();
      // Bring horizontally scrollable tab strips into view, as a touch user can.
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.locator(selector).click();
      await expect(page).toHaveURL(new RegExp(`view=${view}&tab=${tab}`));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${view}/${tab}`).toBe(true);
      await expect(page.getByText('Bu bölüm şu anda görüntülenemiyor.')).toHaveCount(0);
    }
  }
});
