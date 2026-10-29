import { test, expect } from '@playwright/test';
import { login, skipTour, collectProblems, SHOTS } from './helpers';

const PAGES = [
  ['Dashboard', '/dashboard'], ['Reservierungen', '/reservations'], ['Pension', '/pension'],
  ['Personal', '/staff'], ['Layout', '/layout'], ['Meiti AI', '/meiti-ai'], ['Analytics', '/analytics'],
  ['Kapazität', '/capacity'], ['Einstellungen', '/settings'],
] as const;

test('Login-Seite: falsches Passwort zeigt Fehler, kein Login @mobil', async ({ page }) => {
  await skipTour(page);
  await page.goto('/');
  await page.getByLabel('Benutzername').fill('admin');
  await page.getByLabel('Passwort').fill('falsch');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-login-falsch.png`, fullPage: true });
  await expect(page.getByRole('link', { name: 'Reservierungen' })).toHaveCount(0);
});

test('Navigation: alle Menüpunkte laden ohne JS-/500-Fehler @mobil', async ({ page }) => {
  await skipTour(page);
  const problems = collectProblems(page);
  await login(page);
  const isMobile = test.info().project.name === 'handy';
  const perPage: Record<string, string[]> = {};
  for (const [name, path] of PAGES) {
    const before = problems.length;
    if (isMobile) {
      await page.goto(path);
    } else {
      await page.getByRole('link', { name, exact: true }).first().click();
    }
    await expect(page).toHaveURL(new RegExp(path));
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-seite-${path.slice(1)}.png`, fullPage: true });
    perPage[path] = problems.slice(before);
  }
  test.info().annotations.push({ type: 'probleme-pro-seite', description: JSON.stringify(perPage) });
  // Bekannter Befund (eigener Test unten): Meiti AI → HTTP 500 bei chat-conversations.
  const hard = problems.filter((p) => (p.startsWith('pageerror') || p.startsWith('HTTP 5')) && !p.includes('employee_id=mock-employee-id'));
  expect(hard, hard.join('\n')).toEqual([]);
});

test('BEFUND Meiti AI: Seite lädt Konversationen ohne HTTP 500', async ({ page }) => {
  test.fail(true, 'BEFUND: Frontend schickt employee_id=mock-employee-id (keine UUID) → Backend 500');
  await skipTour(page);
  const problems = collectProblems(page);
  await login(page);
  await page.goto('/meiti-ai');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SHOTS}/desktop-meiti-ai.png`, fullPage: true });
  expect(problems.filter((p) => p.startsWith('HTTP 5'))).toEqual([]);
});

test('Ursache "Klicks gehen nicht": Onboarding-Overlay blockiert Klicks bei neuem Browser', async ({ page }) => {
  // bewusst OHNE skipTour
  await login(page);
  await page.waitForTimeout(1600);
  const overlay = page.locator('div.fixed.inset-0.z-50');
  const visible = await overlay.first().isVisible().catch(() => false);
  await page.screenshot({ path: `${SHOTS}/desktop-onboarding-overlay.png` });
  test.info().annotations.push({ type: 'overlay-sichtbar', description: String(visible) });
  if (visible) {
    // Klick auf Menüpunkt wird vom Overlay abgefangen
    let blocked = false;
    try {
      await page.getByRole('link', { name: 'Pension', exact: true }).first().click({ timeout: 2000 });
    } catch { blocked = true; }
    test.info().annotations.push({ type: 'klick-blockiert', description: String(blocked) });
    expect(blocked).toBeTruthy();
  }
});

test('Mobil: Menü-Button öffnet Navigation @mobil', async ({ page }) => {
  test.skip(test.info().project.name !== 'handy', 'nur Handy');
  await skipTour(page);
  await login(page);
  const btn = page.getByRole('button', { name: 'Menü öffnen' });
  await expect(btn).toBeVisible();
  await btn.click();
  await page.getByRole('link', { name: 'Pension', exact: true }).first().click();
  await expect(page).toHaveURL(/\/pension/);
  await page.screenshot({ path: `${SHOTS}/handy-menue-pension.png`, fullPage: true });
});
