import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = 'http://127.0.0.1:3001';
const outDir = join(process.cwd(), 'artifacts', 'chat-navigation-verification');
mkdirSync(outDir, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeGoto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await wait(500);
}

async function capture(page, name) {
  const filePath = join(outDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
  return filePath;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', message: message.text() });
  });

  const report = {
    baseUrl,
    initialPath: '',
    supportNavigation: { before: '', after: '', ok: false, selector: 'role=link[name="Support"]', screenshot: '' },
    homeNavigation: { before: '', after: '', ok: false, selector: 'role=link[name="SkillSwap"]', screenshot: '' },
    errors,
  };

  try {
    await safeGoto(page, `${baseUrl}/chat`);
    report.initialPath = await page.evaluate(() => location.pathname);

    const supportLink = page.getByRole('link', { name: 'Support' });
    report.supportNavigation.before = await page.evaluate(() => location.pathname);
    await supportLink.click({ timeout: 15000 });
    await page.waitForURL('**/support', { timeout: 15000 });
    await wait(250);
    report.supportNavigation.after = await page.evaluate(() => location.pathname);
    report.supportNavigation.ok = report.supportNavigation.after === '/support';
    report.supportNavigation.screenshot = await capture(page, 'after-support');

    await safeGoto(page, `${baseUrl}/chat`);
    report.homeNavigation.before = await page.evaluate(() => location.pathname);
    const homeLink = page.getByRole('link', { name: 'SkillSwap' });
    await homeLink.click({ timeout: 15000 });
    await page.waitForURL('**/', { timeout: 15000 });
    await wait(250);
    report.homeNavigation.after = await page.evaluate(() => location.pathname);
    report.homeNavigation.ok = report.homeNavigation.after === '/';
    report.homeNavigation.screenshot = await capture(page, 'after-home');
  } catch (error) {
    errors.push({ type: 'fatal', message: String(error?.message || error) });
    await capture(page, 'failure');
  }

  const reportPath = join(outDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
