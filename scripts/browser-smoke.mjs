import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const TYPES = ['chromium', 'firefox', 'webkit'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

async function serve(request, response) {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(PUBLIC, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(PUBLIC)) { response.writeHead(403).end(); return; }
    const data = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' }).end(data);
  } catch { response.writeHead(404).end(); }
}

async function journey(browser, base, viewport) {
  const context = await browser.newContext({ viewport, acceptDownloads: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { async writeText() { throw new Error('Deliberate permission-denial fixture'); } } });
    });
    await page.goto(base);
    const forwardTab = page.getByRole('tab', { name: 'dnsmasq hosts.d → BIND9 Zone Generator', exact: true });
    const hostsTab = page.getByRole('tab', { name: 'BIND → /etc/hosts', exact: true });
    assert.equal(await forwardTab.getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panel-hosts').isVisible(), false);
    await page.locator('#exampleForwardButton').click();
    await page.locator('#generateButton').click();
    const original = await page.locator('#forwardOutput').textContent();
    assert.match(original, /app.example.com.\s+IN A 192.0.2.10/);
    const serial = Number(await page.locator('#previousSerial').inputValue());
    await page.locator('#generateButton').click();
    assert.equal(Number(await page.locator('#previousSerial').inputValue()), serial + 1);
    await forwardTab.focus();
    await page.keyboard.press('End');
    assert.equal(await hostsTab.getAttribute('aria-selected'), 'true');
    assert.equal(await hostsTab.evaluate((element) => element === document.activeElement), true);
    await page.locator('#exampleBindButton').click();
    await page.locator('#generateHostsButton').click();
    assert.match(await page.locator('#hostsOutput').textContent(), /portal.example.com/);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#downloadHostsButton').click()]);
    assert.equal(download.suggestedFilename(), 'hosts');
    assert.match(await fs.readFile(await download.path(), 'utf8'), /192.0.2.10/);
    await page.locator('#copyHostsButton').click();
    await page.getByText('Copy failed. Select the output and copy it manually, or download the file.', { exact: true }).waitFor();
    await page.locator('#bindInput').fill('$INCLUDE forbidden');
    assert.equal(await page.locator('#copyHostsButton').isDisabled(), true);
    await page.locator('#generateHostsButton').click();
    assert.equal(await page.locator('#hostsOutput').textContent(), '');
    assert.match(await page.locator('#bindSummary').textContent(), /blocked/);
    await hostsTab.focus();
    await page.keyboard.press('Home');
    assert.equal(await forwardTab.getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('#forwardOutput').textContent(), /app.example.com/);
    await page.locator('#networkPrefix').fill('192.0.2.0/20');
    assert.equal(await page.locator('#copyForwardButton').isDisabled(), true);
    await page.locator('#generateButton').click();
    assert.equal(await page.locator('#forwardOutput').textContent(), '');
    for (const id of await page.locator('input,textarea,select').evaluateAll((elements) => elements.map((element) => element.id))) assert.equal(await page.locator(`label[for="${id}"]`).count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No document-wide horizontal overflow');
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No document-wide overflow at 200% zoom');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

async function main() {
  const module = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright';
  let playwright;
  try { playwright = await import(module); } catch { throw new Error('Playwright is optional local tooling. Set PLAYWRIGHT_MODULE to an installed Playwright index.mjs. No browser checks ran.'); }
  const server = http.createServer(serve);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    for (const type of TYPES) {
      const browser = await playwright[type].launch({ headless: true });
      try {
        for (const viewport of VIEWPORTS) {
          await journey(browser, base, viewport);
          console.log(`${type} ${viewport.width}x${viewport.height}: PASS`);
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

await main();
