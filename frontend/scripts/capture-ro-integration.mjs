import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.RO_REVIEW_URL || 'http://127.0.0.1:3010';
const outputDir = path.resolve('artifacts/ro-integration');
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function capture({ name, route, viewport, mobile = false, arabic = false }) {
  const context = await browser.newContext({
    viewport,
    isMobile: mobile,
    deviceScaleFactor: 1,
    locale: arabic ? 'ar-EG' : 'en-US',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = [];
  const networkFailures = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      networkFailures.push({ status: response.status(), url: response.url() });
    }
  });

  const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1800);
  if (arabic) {
    await page.getByRole('button', { name: 'AR', exact: true }).first().click();
    await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  }
  if (route === '/') {
    await page.locator('img[src*="hero-flat-lay"]').first().waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForFunction(() => {
      const image = document.querySelector('img[src*="hero-flat-lay"]');
      return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    }, undefined, { timeout: 60_000 });
  }
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true, timeout: 120_000 });

  const metrics = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const join = links.find((node) => /join r&o|انضم إلى r&o/i.test(node.textContent || ''));
    const browse = links.find((node) => /browse listings|تصفّح الإعلانات/i.test(node.textContent || ''));
    const subscribe = links.find((node) => /subscribe now|اشترك الآن/i.test(node.textContent || ''));
    const style = (node) => node ? {
      backgroundColor: getComputedStyle(node).backgroundColor,
      backgroundImage: getComputedStyle(node).backgroundImage,
      color: getComputedStyle(node).color,
    } : null;
    return {
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      join: style(join),
      browse: style(browse),
      subscribe: style(subscribe),
    };
  });

  results.push({ name, route, status: response?.status(), viewport, errors, networkFailures, ...metrics });
  await context.close();
}

await capture({ name: 'after-home-desktop-1440', route: '/', viewport: { width: 1440, height: 1000 } });
await capture({ name: 'after-home-mobile-390', route: '/', viewport: { width: 390, height: 844 }, mobile: true });
await capture({ name: 'after-home-mobile-430-ar', route: '/', viewport: { width: 430, height: 932 }, mobile: true, arabic: true });
await capture({ name: 'after-browse-desktop', route: '/listings', viewport: { width: 1440, height: 1000 } });
await capture({ name: 'after-auth-signin-mobile', route: '/auth/signin', viewport: { width: 390, height: 844 }, mobile: true });
await capture({ name: 'after-subscription-desktop', route: '/pricing', viewport: { width: 1440, height: 1000 } });
await capture({ name: 'after-messaging-desktop', route: '/chat', viewport: { width: 1440, height: 1000 } });
await capture({ name: 'after-support-desktop', route: '/support', viewport: { width: 1440, height: 1000 } });

await fs.writeFile(path.join(outputDir, 'visual-report.json'), JSON.stringify(results, null, 2));
await browser.close();

const failures = results.filter((item) => item.status !== 200 || item.horizontalOverflow || item.errors.length);
console.log(JSON.stringify({ captures: results.length, failures }, null, 2));
