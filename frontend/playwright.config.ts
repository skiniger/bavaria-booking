import { defineConfig, devices } from '@playwright/test';

// Lokale E2E-Tests (29.10.2026). Erwartet laufendes Backend (SQLite, Testdaten) und Vite-Dev-Server:
//   Backend:  USE_SQLITE=True python manage.py runserver 127.0.0.1:18765
//   Frontend: VITE_API_URL=http://localhost:18765/api npx vite --port 5173
const OUT = process.env.BBX_REPORT_DIR ?? 'e2e-report';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 0,
  workers: 1,
  outputDir: `${OUT}/artifacts`,
  reporter: [['list'], ['json', { outputFile: `${OUT}/playwright-results.json` }], ['html', { outputFolder: `${OUT}/html`, open: 'never' }]],
  use: {
    baseURL: process.env.BBX_FRONTEND_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'handy', use: { ...devices['Pixel 7'] }, grep: /@mobil/ },
  ],
});
