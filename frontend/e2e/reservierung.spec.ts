import { test, expect } from '@playwright/test';
import { login, skipTour, collectProblems, field, SHOTS, API, apiSession } from './helpers';

function inTwoDays() {
  const d = new Date(Date.now() + 2 * 86400000);
  return d.toISOString().slice(0, 10);
}

test('Reservierung anlegen: neuer Gast → Termin → Speichern landet im Backend', async ({ page, request }) => {
  await skipTour(page);
  const problems = collectProblems(page);
  await login(page);
  await page.getByRole('link', { name: 'Reservierungen', exact: true }).first().click();
  await page.getByRole('button', { name: 'Neue Reservierung' }).click();
  const dlg = page.locator('div.fixed.inset-0').filter({ hasText: 'Neue Reservierung' }).last();
  await expect(dlg).toBeVisible();
  const nachname = `E2E-${Date.now()}`;
  await field(dlg, 'Vorname').fill('Test');
  await field(dlg, 'Nachname').fill(nachname);
  await field(dlg, 'Telefon *').fill('089 1234567');
  await dlg.locator('input[type=checkbox]').first().check(); // DSGVO-Pflicht
  await page.screenshot({ path: `${SHOTS}/desktop-reservierung-schritt1.png` });
  await dlg.getByRole('button', { name: 'Weiter zur Reservierung' }).click();
  await expect(field(dlg, 'Datum', 'input')).toBeVisible({ timeout: 10_000 });
  await field(dlg, 'Datum').fill(inTwoDays());
  await field(dlg, 'Uhrzeit').fill('18:30');
  await field(dlg, 'Anzahl Gäste').fill('2');
  await page.screenshot({ path: `${SHOTS}/desktop-reservierung-schritt2.png` });
  const resp = page.waitForResponse((r) => r.url().includes('/api/reservations/') && r.request().method() === 'POST');
  await dlg.getByRole('button', { name: 'Reservierung erstellen' }).click();
  const r = await resp;
  test.info().annotations.push({ type: 'POST /reservations', description: `${r.status()} ${await r.text()}` });
  expect(r.status()).toBe(201);
  await expect(dlg).toBeHidden();
  await page.screenshot({ path: `${SHOTS}/desktop-reservierung-gespeichert.png`, fullPage: true });

  await apiSession(request);
  const list = await (await request.get(`${API}/reservations/?date=${inTwoDays()}`)).json();
  expect(JSON.stringify(list)).toContain(nachname);
  expect(problems.filter((p) => p.startsWith('pageerror'))).toEqual([]);
});

test('Reservierung: DSGVO-Haken fehlt → Formular bleibt in Schritt 1, kein Request', async ({ page }) => {
  await skipTour(page);
  await login(page);
  await page.goto('/reservations');
  await page.getByRole('button', { name: 'Neue Reservierung' }).click();
  const dlg = page.locator('div.fixed.inset-0').filter({ hasText: 'Neue Reservierung' }).last();
  await field(dlg, 'Vorname').fill('Ohne');
  await field(dlg, 'Nachname').fill('Haken');
  await field(dlg, 'Telefon *').fill('089 1');
  let posted = false;
  page.on('request', (r) => { if (r.url().includes('/api/guests/') && r.method() === 'POST') posted = true; });
  await dlg.getByRole('button', { name: 'Weiter zur Reservierung' }).click();
  await page.waitForTimeout(800);
  expect(posted).toBeFalsy();
  await expect(dlg.getByText('Schritt 1').first()).toBeVisible();
  const msg = await dlg.locator('input[type=checkbox]').first().evaluate((el) => (el as HTMLInputElement).validationMessage);
  test.info().annotations.push({ type: 'Browser-Validierung', description: msg });
  await page.screenshot({ path: `${SHOTS}/desktop-reservierung-ohne-dsgvo.png` });
});

test('Reservierung: Fehler vom Backend (Tisch belegt) wird dem Nutzer angezeigt', async ({ page, request }) => {
  // BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: Mutation ohne onError – HTTP 400 wurde nicht angezeigt.
  await skipTour(page);
  // Tisch per API belegen
  const csrf = await apiSession(request);
  const tables = await (await request.get(`${API}/tables/`)).json();
  const table = (tables.results ?? tables).find((t: { capacity: number; is_reservable: boolean }) => t.capacity >= 2 && t.is_reservable);
  const guest = await (await request.post(`${API}/guests/`, { data: { first_name: 'Block', last_name: 'Er', phone_number: '089 1' }, headers: { 'X-CSRFToken': csrf, Referer: 'http://localhost:5173/' } })).json();
  const when = `${inTwoDays()}T12:00:00`;
  const blk = await request.post(`${API}/reservations/`, { data: { guest: guest.id, table: table.id, reservation_time: when, number_of_guests: 2 }, headers: { 'X-CSRFToken': csrf, Referer: 'http://localhost:5173/' } });
  expect([201, 400]).toContain(blk.status());

  await login(page);
  await page.goto('/reservations');
  await page.getByRole('button', { name: 'Neue Reservierung' }).click();
  const dlg = page.locator('div.fixed.inset-0').filter({ hasText: 'Neue Reservierung' }).last();
  await field(dlg, 'Vorname').fill('Doppel');
  await field(dlg, 'Nachname').fill('Buchung');
  await field(dlg, 'Telefon *').fill('089 7654321');
  await dlg.locator('input[type=checkbox]').first().check();
  await dlg.getByRole('button', { name: 'Weiter zur Reservierung' }).click();
  await field(dlg, 'Datum').fill(inTwoDays());
  await field(dlg, 'Uhrzeit').fill('12:30');
  await field(dlg, 'Tisch', 'select').selectOption(table.id).catch(() => undefined);
  const resp = page.waitForResponse((r) => r.url().includes('/api/reservations/') && r.request().method() === 'POST');
  await dlg.getByRole('button', { name: 'Reservierung erstellen' }).click();
  const r = await resp;
  test.info().annotations.push({ type: 'POST /reservations (belegt)', description: `${r.status()}` });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/desktop-reservierung-fehlerfall.png` });
  expect(r.status()).toBe(400);
  // Erwartung: sichtbare Fehlermeldung (Toast oder Text). BEFUND, falls nicht.
  const alerts = page.locator('[role=alert]');
  const dlgText = (await dlg.innerText()).toLowerCase();
  const shown = (await alerts.count()) > 0 || dlgText.includes('belegt') || dlgText.includes('fehler');
  test.info().annotations.push({ type: 'Fehlermeldung sichtbar', description: String(shown) });
  expect(shown, 'BEFUND: Keine sichtbare Fehlermeldung nach HTTP 400 – der Klick wirkt für den Nutzer wirkungslos').toBeTruthy();
});
