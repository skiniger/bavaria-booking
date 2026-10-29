import { test, expect } from '@playwright/test';
import { login, skipTour, collectProblems, field, SHOTS, API, apiSession } from './helpers';

test('Pension: neuen Gast erfassen → Meldeschein öffnet sich und lässt sich speichern', async ({ page, request }) => {
  // BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: nach "Neuer Gast" setzte onClose selectedGuest=null → Button deaktiviert
  test.setTimeout(30_000);
  await skipTour(page);
  const problems = collectProblems(page);
  await login(page);
  await page.getByRole('link', { name: 'Pension', exact: true }).first().click();
  await page.getByRole('button', { name: 'Neuer Gast' }).click();
  const dlg = page.locator('div.fixed.inset-0').last();
  const nachname = `Melde-${Date.now()}`;
  await field(dlg, 'Anrede', 'select').selectOption({ index: 1 }).catch(() => undefined);
  await field(dlg, 'Vorname').fill('Erika');
  await field(dlg, 'Nachname').fill(nachname);
  await field(dlg, 'Geburtsdatum').fill('1980-05-17');
  const nat = field(dlg, 'Staatsangehörigkeit');
  if (await nat.count()) await nat.fill('deutsch'); else await field(dlg, 'Staatsangehörigkeit', 'select').selectOption({ index: 1 });
  await field(dlg, 'Straße').fill('Dorfstraße');
  await field(dlg, 'Hausnr.').fill('1');
  await field(dlg, 'Postleitzahl').fill('86000');
  await field(dlg, 'Ort').fill('Augsburg');
  const land = field(dlg, 'Land *');
  if (await land.count()) await land.fill('Deutschland').catch(async () => field(dlg, 'Land *', 'select').selectOption({ index: 1 }));
  await field(dlg, 'Dokumenttyp', 'select').selectOption({ index: 1 }).catch(() => undefined);
  await field(dlg, 'Dokumentnummer').fill('T22000129');
  const cb = dlg.locator('input[type=checkbox]').first();
  if (await cb.count()) await cb.check();
  await page.screenshot({ path: `${SHOTS}/desktop-pension-gast-formular.png`, fullPage: true });
  const resp = page.waitForResponse((r) => r.url().includes('/api/pension-guests/') && r.request().method() === 'POST');
  await dlg.locator('button[type=submit]').last().click();
  const r = await resp;
  test.info().annotations.push({ type: 'POST /pension-guests', description: `${r.status()} ${(await r.text()).slice(0, 300)}` });
  expect(r.status()).toBe(201);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/desktop-pension-nach-gast.png`, fullPage: true });

  // Nach dem Anlegen öffnet die App den Meldeschein direkt (handleGuestCreated).
  await expect(page.getByText('Anreisedatum').first()).toBeVisible({ timeout: 10_000 });
  const form = page.locator('div.fixed.inset-0').last();
  const a = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const d = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
  await field(form, 'Anreisedatum').fill(a);
  await field(form, 'Abreisedatum').fill(d);
  await field(form, 'Zimmernummer').fill('7');
  await field(form, 'Zimmerpreis pro Nacht').fill('60');
  await field(form, 'Zweck des Aufenthalts', 'select').selectOption({ index: 0 }).catch(() => undefined);
  await field(form, 'Zahlungsart', 'select').selectOption({ index: 1 }).catch(() => undefined);
  await page.screenshot({ path: `${SHOTS}/desktop-meldeschein-formular.png`, fullPage: true });
  const invalid = await form.locator('form').first().evaluate((f) =>
    Array.from(f.querySelectorAll(':invalid')).map((el) => `${el.tagName} ${(el as HTMLInputElement).name || ''} ${(el as HTMLInputElement).type || ''}: ${(el as HTMLInputElement).validationMessage}`));
  test.info().annotations.push({ type: 'ungültige Felder vor Absenden', description: JSON.stringify(invalid) });
  const btn = form.locator('button[type=submit]').last();
  test.info().annotations.push({ type: 'Submit-Button', description: `${await btn.textContent()} disabled=${await btn.isDisabled()}` });
  await expect(btn, 'Button "Meldeschein erstellen" ist deaktiviert').toBeEnabled({ timeout: 3000 });
  const resp2 = page.waitForResponse((r) => r.url().includes('/api/registration-forms/') && r.request().method() === 'POST');
  await form.locator('button[type=submit]').last().click();
  const r2 = await Promise.race([resp2, page.waitForTimeout(8000).then(() => null)]);
  if (!r2) { await page.screenshot({ path: `${SHOTS}/desktop-meldeschein-kein-request.png`, fullPage: true }); }
  expect(r2, 'Klick auf Speichern hat keinen Request ausgelöst').not.toBeNull();
  if (!r2) return;
  test.info().annotations.push({ type: 'POST /registration-forms', description: `${r2.status()} ${(await r2.text()).slice(0, 300)}` });
  expect(r2.status()).toBe(201);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/desktop-meldeschein-gespeichert.png`, fullPage: true });

  await apiSession(request);
  const forms = await (await request.get(`${API}/registration-forms/`)).json();
  expect(JSON.stringify(forms)).toContain(nachname);
  expect(problems.filter((p) => p.startsWith('pageerror'))).toEqual([]);
});

test('Pension: Meldeschein über "Neuer Meldeschein" → Gastsuche → Auswahl → Speichern', async ({ page, request }) => {
  // BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: formData.guest nur beim ersten Mount gesetzt → POST mit guest=null → 400
  await skipTour(page);
  await login(page);
  await page.goto('/pension');
  await page.getByRole('button', { name: 'Neuer Meldeschein' }).click();
  await page.getByPlaceholder('Name oder Dokumentnummer eingeben...').fill('Melde');
  await page.locator('button', { hasText: 'Melde-' }).first().click();
  await expect(page.getByText('Anreisedatum').first()).toBeVisible();
  const form = page.locator('div.fixed.inset-0').last();
  const a = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const d = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
  await field(form, 'Anreisedatum').fill(a);
  await field(form, 'Abreisedatum').fill(d);
  await field(form, 'Zimmernummer').fill('7');
  await field(form, 'Zimmerpreis pro Nacht').fill('60');
  const uiTotal = (await form.getByText(/Gesamtsumme/).locator('xpath=..').innerText()).replace(/\s+/g, ' ');
  await page.screenshot({ path: `${SHOTS}/desktop-meldeschein-ueber-suche.png`, fullPage: true });
  const resp = page.waitForResponse((r) => r.url().includes('/api/registration-forms/') && r.request().method() === 'POST');
  await form.locator('button[type=submit]').last().click();
  const r = await resp;
  const body = await r.json();
  test.info().annotations.push({ type: 'POST /registration-forms', description: `${r.status()} ${JSON.stringify(body).slice(0, 300)} | UI: ${uiTotal}` });
  expect(r.status()).toBe(201);
  // Fix 4: Kurtaxe = Satz × Nächte (1 Person je Meldeschein); UI und Backend müssen dieselbe Summe zeigen.
  await apiSession(request);
  const rate = Number((await (await request.get(`${API}/system-settings/`)).json())[0]?.tourist_tax_rate ?? 2.5);
  const uiNumber = Number((uiTotal.match(/([\d.]+)\s*€/) ?? [])[1]);
  expect(Number(body.tourist_tax_amount)).toBeCloseTo(3 * rate, 2);
  expect(uiNumber).toBeCloseTo(3 * 60 + 3 * rate, 2);
  expect(Number(body.total_amount), `Summe: UI ${uiNumber} € ≠ Backend ${body.total_amount} €`).toBeCloseTo(uiNumber, 2);
});
