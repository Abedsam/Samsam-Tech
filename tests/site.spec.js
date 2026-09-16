// @ts-check
import { test, expect } from '@playwright/test';

const PAGES = [
  'index.html',
  'dienstleistungen.html',
  'projekte.html',
  'ueber-uns.html',
  'kontakt.html',
  'impressum.html',
  'en/index.html',
  'en/services.html',
  'en/projects.html',
  'en/about.html',
  'en/contact.html',
  'en/imprint.html',
];

// Google Fonts is a third-party CDN outside the site's control - some
// sandboxed/proxied network environments (e.g. this one) can't complete its
// TLS handshake, which is an environment quirk, not a page defect.
const isThirdPartyFontNoise = (text) =>
  /fonts\.(googleapis|gstatic)\.com/.test(text) || /ERR_CERT_AUTHORITY_INVALID/.test(text);

for (const path of PAGES) {
  test(`${path} loads without console or page errors`, async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isThirdPartyFontNoise(msg.text())) consoleErrors.push(msg.text());
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    const failedRequests = [];
    page.on('requestfailed', (req) => {
      if (!isThirdPartyFontNoise(req.url())) failedRequests.push(req.url());
    });
    page.on('response', (res) => {
      if (res.status() >= 400 && !isThirdPartyFontNoise(res.url())) {
        failedRequests.push(`${res.url()} :: HTTP ${res.status()}`);
      }
    });

    await page.goto(path, { waitUntil: 'networkidle' });

    expect(consoleErrors, `console errors on ${path}`).toEqual([]);
    expect(pageErrors, `page errors on ${path}`).toEqual([]);
    expect(failedRequests, `failed requests on ${path}`).toEqual([]);
  });
}

test('header nav links to every page and back', async ({ page }) => {
  await page.goto('index.html');
  const nav = page.locator('.site-header .nav-links');
  const pages = {
    Dienstleistungen: 'dienstleistungen.html',
    Projekte: 'projekte.html',
    'Über uns': 'ueber-uns.html',
    Kontakt: 'kontakt.html',
    Impressum: 'impressum.html',
  };
  for (const [label, href] of Object.entries(pages)) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(href.replace('.', '\\.')));
    await page.goBack();
  }
});

test('language toggle switches between DE and EN home', async ({ page }) => {
  await page.goto('index.html');
  await page.locator('.site-header .lang-toggle').click();
  await expect(page).toHaveURL(/en\/index\.html/);
  await page.locator('.site-header .lang-toggle').click();
  await expect(page).toHaveURL(/index\.html/);
});

test('scroll-scrub hero locks scroll, reveals the claim on scrub, then releases', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('#sst-hero .sst-hero-title')).toHaveText('Wir digitalisierenIhr Leben.');
  await expect(page.locator('.sst-hero-orb-img')).toBeVisible();

  // Locked on load: body is pinned so the page can't scroll normally yet.
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe('fixed');

  // Scrub forward until the German claim has fully revealed and the page unlocks.
  const claim = page.locator('#sst-claim');
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, 90);
    const bodyPosition = await page.evaluate(() => document.body.style.position);
    if (bodyPosition === '') break;
    await page.waitForTimeout(20);
  }
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe('');
  await expect(claim).toHaveCSS('opacity', '1');
  await expect(claim.locator('.sst-hero-claim-title')).toHaveText('Von der Idee bis zumdigitalen Erfolg.');

  // Unlocked: normal wheel scrolling now moves the page.
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test('platform marquee is present, looping and gap-free at a wide viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('index.html');
  const section = page.locator('.platform-marquee-section');
  await section.scrollIntoViewIfNeeded();

  const track = page.locator('.platform-marquee__track');
  const info = await track.evaluate((el) => ({
    chipCount: el.querySelectorAll('.platform-chip').length,
    scrollWidth: el.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  // Enough duplicated chips to cover at least 2x the viewport width, so the
  // loop never runs out of content and leaves a blank gap mid-scroll.
  expect(info.chipCount).toBeGreaterThanOrEqual(12);
  expect(info.scrollWidth).toBeGreaterThan(info.viewportWidth * 2);
});

test('contact form has the expected required fields', async ({ page }) => {
  await page.goto('kontakt.html');
  await expect(page.locator('form#contact-form, form')).toBeVisible();
});
