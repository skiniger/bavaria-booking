import { expect, type Page, type APIRequestContext } from '@playwright/test';

export const API = process.env.BBX_API_URL ?? 'http://localhost:18765/api';
export const USER = process.env.BBX_USER ?? 'admin';
export const PASS = process.env.BBX_PASS ?? 'admin123';
export const SHOTS = process.env.BBX_SHOTS ?? 'e2e-report/screens';

/** Onboarding-Tour als erledigt markieren (sonst legt sie nach 1 s ein Vollbild-Overlay über die App). */
export async function skipTour(page: Page) {
  await page.addInitScript(() => localStorage.setItem('bavariabooking_tour_completed', 'true'));
}

export function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`); });
  return problems;
}

export async function login(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'BAVARIABOOKINGX' })).toBeVisible();
  await page.getByLabel('Benutzername').fill(USER);
  await page.getByLabel('Passwort').fill(PASS);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('link', { name: 'Reservierungen' }).first()).toBeVisible({ timeout: 15_000 });
}

/** Feld in einem Formular über den sichtbaren Label-Text finden (Labels sind nicht per htmlFor verknüpft). */
export function field(scope: Page | ReturnType<Page['locator']>, label: string, tag = 'input') {
  return scope.locator(`xpath=.//label[contains(normalize-space(.), "${label}")]/following-sibling::${tag}[1] | .//label[contains(normalize-space(.), "${label}")]/..//${tag}[1]`).first();
}

export async function apiSession(request: APIRequestContext) {
  await request.get(`${API}/auth/csrf/`);
  const state = await request.storageState();
  const csrf = state.cookies.find((c) => c.name === 'csrftoken')?.value ?? '';
  const r = await request.post(`${API}/auth/login/`, { data: { username: USER, password: PASS }, headers: { 'X-CSRFToken': csrf, Referer: 'http://localhost:5173/' } });
  expect(r.ok()).toBeTruthy();
  const s2 = await request.storageState();
  return s2.cookies.find((c) => c.name === 'csrftoken')?.value ?? csrf;
}
