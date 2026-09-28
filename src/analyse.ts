import { chromium, type Browser } from 'playwright';
import { collectFacts } from './extract.js';
import { scoreFacts } from './signals.js';
import type { Report } from './types.js';

/**
 * Local dev drives the Chrome that is already installed, because Playwright
 * cannot install its own Chromium on macOS 12. On a server this becomes
 * @sparticuz/chromium; the rest of the pipeline does not care which.
 */
async function launch(): Promise<Browser> {
  return chromium.launch({ channel: 'chrome', args: ['--disable-dev-shm-usage'] });
}

export async function analyse(url: string, browser?: Browser): Promise<Report> {
  const own = !browser;
  const b = browser ?? (await launch());
  try {
    const page = await b.newPage({
      viewport: { width: 1440, height: 900 },
      // A plain desktop UA: some sites serve a stripped page to headless.
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    // esbuild (via tsx) rewrites named functions to reference a __name helper
    // that only exists in the bundle, not in the page. collectFacts is
    // serialised and evaluated inside the browser, where that reference blows
    // up. Injected as a raw string so the transform cannot touch it.
    await page.addInitScript({
      content: 'globalThis.__name = globalThis.__name || function (f) { return f; };',
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    // Webfonts decide the type facts, so wait for them rather than racing.
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.waitForTimeout(600);

    const facts = await page.evaluate(collectFacts);
    await page.close();
    return scoreFacts({ ...facts, url });
  } finally {
    if (own) await b.close();
  }
}

export { launch };
