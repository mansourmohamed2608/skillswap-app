import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = 'http://127.0.0.1:3001';
const outDir = join(process.cwd(), 'artifacts', 'notifications-verification');
mkdirSync(outDir, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeGoto(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      return;
    } catch (error) {
      lastError = error;
      await wait(500 * attempt);
    }
  }
  throw lastError;
}

async function signupIfNeeded(page) {
  await safeGoto(page, `${baseUrl}/`);

  const hasBell = await page.locator('header button[aria-label="Notifications"]:visible').count();
  if (hasBell > 0) return { signedIn: true, method: 'already-authenticated' };

  await safeGoto(page, `${baseUrl}/auth/signup`);

  const nonce = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `notif.verify.${nonce}@example.com`;
  const password = `Verify@${nonce}`;

  await page.locator('input[name="fullName"]').fill('Notif Verify User');
  await page.locator('input[name="username"]').fill(`notifverify${nonce.slice(-8)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="phoneNumber"]').fill(`+2010${nonce.slice(-7)}`);
  await page.locator('input[name="occupation"]').fill('Tester');

  await page.getByRole('combobox').first().click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.locator('input[name="city"]').fill('Cairo');
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);

  await page.getByRole('button', { name: /create account|sign up|submit/i }).click();
  await page.waitForURL(/\/profile\/verify|\//, { timeout: 30000 }).catch(() => {});
  await safeGoto(page, `${baseUrl}/`);

  const bellAfter = await page.locator('header button[aria-label="Notifications"]:visible').count();
  return {
    signedIn: bellAfter > 0,
    method: bellAfter > 0 ? 'signup' : 'signup-failed',
    email,
  };
}

async function verifyDesktop(page, width, height) {
  await page.setViewportSize({ width, height });
  await safeGoto(page, `${baseUrl}/`);
  await wait(300);

  const bell = page.locator('header button[aria-label="Notifications"]:visible').first();
  const bellCount = await bell.count();
  if (!bellCount) {
    return { width, height, ok: false, reason: 'notification bell not visible (not authenticated?)' };
  }

  await bell.click();
  await wait(350);

  const panel = page.locator('[data-radix-popover-content-wrapper] > div').first();
  const panelVisible = await panel.isVisible().catch(() => false);

  const bellBox = await bell.boundingBox();
  const panelBox = panelVisible ? await panel.boundingBox() : null;

  const overlayCount = await page.locator('[data-slot="sheet-overlay"][data-state="open"], [data-radix-dialog-overlay]').count();

  const aligned = !!(bellBox && panelBox) && Math.abs((panelBox.x + panelBox.width) - (bellBox.x + bellBox.width)) <= 150;
  const notFarLeft = !!(panelBox) && panelBox.x > Math.max(20, width * 0.45);

  const screenshot = join(outDir, `desktop-${width}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  return {
    width,
    height,
    panelVisible,
    bellBox,
    panelBox,
    aligned,
    notFarLeft,
    hasBackdrop: overlayCount > 0,
    screenshot,
    ok: panelVisible && aligned && notFarLeft && overlayCount === 0,
  };
}

async function verifyMobile(page, width, height) {
  await page.setViewportSize({ width, height });
  await safeGoto(page, `${baseUrl}/`);
  await wait(250);

  const bell = page.locator('header button[aria-label="Notifications"]:visible').first();
  if (!(await bell.count())) {
    return { width, height, ok: false, reason: 'notification bell not visible' };
  }

  await bell.click();
  await wait(350);

  const title = page.getByText('Notifications', { exact: true }).first();
  const titleVisible = await title.isVisible().catch(() => false);

  const sheet = page.locator('[data-slot="sheet-content"][data-state="open"]').first();
  const sheetVisible = await sheet.isVisible().catch(() => false);
  const sheetBox = sheetVisible ? await sheet.boundingBox() : null;

  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  const markReadBtn = page.getByRole('button', { name: /mark all read/i }).first();
  const clearReadBtn = page.getByRole('button', { name: /clear read/i }).first();
  const controlsTappable = (await markReadBtn.isVisible().catch(() => false)) && (await clearReadBtn.isVisible().catch(() => false));

  const screenshot = join(outDir, `mobile-${width}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  return {
    width,
    height,
    titleVisible,
    sheetVisible,
    sheetBox,
    noHorizontalOverflow,
    controlsTappable,
    screenshot,
    ok: titleVisible && sheetVisible && noHorizontalOverflow && controlsTappable,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const authResult = await signupIfNeeded(page);

  const desktop = [];
  for (const width of [1440, 1024, 768]) {
    desktop.push(await verifyDesktop(page, width, 900));
  }

  const mobile = [];
  for (const width of [430, 390, 375]) {
    mobile.push(await verifyMobile(page, width, 812));
  }

  const report = {
    baseUrl,
    authResult,
    desktop,
    mobile,
    generatedAt: new Date().toISOString(),
  };

  const reportPath = join(outDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
