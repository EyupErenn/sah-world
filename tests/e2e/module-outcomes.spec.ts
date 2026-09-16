import { test, expect, type Page } from '@playwright/test';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({page}) => { const items:string[]=[]; errors.set(page,items); page.on('pageerror',error=>items.push(error.name)); });
test.afterEach(({page})=>{expect(errors.get(page)??[]).toEqual([]);});
async function guest(page:Page,url:string){await page.goto(url);await page.getByRole('button',{name:'DEV: Misafir görünümü'}).click();}

test('reports invite one concrete next action before stats and navigate to journal',async({page})=>{
  await guest(page,'/?view=reports');
  const card=page.locator('.report-next-step');
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading',{name:'Bugünden tek bir cümle sakla.'})).toBeVisible();
  await expect(card.getByRole('button')).toHaveCount(1);
  await card.getByRole('button',{name:'Günlüğümü aç'}).click();
  await expect(page).toHaveURL(/view=journal/);
  await expect(page.locator('.journal-notebook')).toBeVisible();
});

test('personal mosque is default; local identity is opt-in and tabs survive refresh and Back',async({page})=>{
  test.setTimeout(120_000);
  await guest(page,'/?view=mescidim');
  await expect(page.getByRole('heading',{name:'Kişisel manevi alanım',exact:true})).toBeVisible();
  await expect(page.locator('.mosque-identity-hero')).toHaveCount(0);
  await page.locator('.mescidim-main-tabs button').filter({hasText:'Dua Kütüphanesi'}).click();
  await expect(page).toHaveURL(/tab=dua/);
  await page.reload();await page.getByRole('button',{name:'DEV: Misafir görünümü'}).click();
  await expect(page.locator('.spiritual-tabs button.active')).toContainText('Dua Kütüphanesi');
  await page.getByRole('tab',{name:'BTÜ cami topluluğu'}).click();
  await expect(page).toHaveURL(/tab=etkinlikler/);
  await expect(page.locator('.mosque-identity-hero')).toBeVisible();
  await expect(page.locator('.mescidim-main-tabs')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/tab=dua/);
  await expect(page.locator('.mosque-identity-hero')).toHaveCount(0);
  await expect(page.locator('.spiritual-tabs button.active')).toContainText('Dua Kütüphanesi');
});
