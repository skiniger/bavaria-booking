import { test, expect, type Page } from '@playwright/test';
import { login, skipTour } from './helpers';

// Passt zu PR 6: Gastdaten-Felder dürfen keine Browser-Vorschläge bekommen.
async function assertAutocompleteOff(page: Page, where: string) {
  const dlg = page.locator('div.fixed.inset-0').last();
  const fields = dlg.locator('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select');
  const n = await fields.count();
  expect(n, `${where}: keine Felder gefunden`).toBeGreaterThan(0);
  const bad: string[] = [];
  for (let i = 0; i < n; i++) {
    const f = fields.nth(i);
    const own = await f.getAttribute('autocomplete');
    const formAttr = await f.evaluate((el) => (el as HTMLInputElement).form?.getAttribute('autocomplete') ?? null);
    if (own !== 'off' && !(own === null && formAttr === 'off')) bad.push(`#${i} ${await f.evaluate((el) => el.outerHTML.slice(0, 120))}`);
  }
  expect(bad, `${where}: Felder ohne autocomplete="off"`).toEqual([]);
}

test.beforeEach(async ({ page }) => { await skipTour(page); await login(page); });

test('Reservierungsformular: alle Gastdaten-Felder autocomplete="off"', async ({ page }) => {
  await page.goto('/reservations');
  await page.getByRole('button', { name: 'Neue Reservierung' }).click();
  await assertAutocompleteOff(page, 'Reservierung');
});

test('Pensionsgast-Formular: alle Felder autocomplete="off"', async ({ page }) => {
  await page.goto('/pension');
  await page.getByRole('button', { name: 'Neuer Gast' }).click();
  await assertAutocompleteOff(page, 'Pensionsgast');
});

test('Login-Formular: Zugangsdaten-Felder behalten username/current-password', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await expect(page.getByLabel('Benutzername')).toHaveAttribute('autocomplete', 'username');
  await expect(page.getByLabel('Passwort')).toHaveAttribute('autocomplete', 'current-password');
});
