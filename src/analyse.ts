import { chromium, type Browser } from 'playwright';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFacts } from './extract.js';
import { scoreFacts } from './signals.js';
import type { Report, PageFacts } from './types.js';

const slug = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 12);

/**
 * Local dev drives the Chrome that is already installed, because Playwright
 * cannot install its own Chromium on macOS 12. On a server this becomes
 * @sparticuz/chromium; the rest of the pipeline does not care which.
 */
async function launch(): Promise<Browser> {
  return chromium.launch({ channel: 'chrome', args: ['--disable-dev-shm-usage'] });
}

export async function analyse(
  url: string,
  browser?: Browser,
  opts: { shot?: boolean } = {}
): Promise<Report> {
  const own = !browser;
  const b = browser ?? (await launch());
  try {
    const page = await b.newPage({
      viewport: { width: 1440, height: 900 },
      // A plain desktop UA: some sites serve a stripped page to headless.
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    // networkidle never settles on sites with polling or persistent sockets -
    // lovable.dev simply times out. Get the DOM first, then give the network a
    // short chance to quieten, and carry on either way.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    // Webfonts decide the type facts, so wait for them rather than racing.
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.waitForTimeout(600);

    // esbuild (via tsx) rewrites named functions to reference a __name helper
    // that exists in the bundle, not in the page. Shadowing it inside the
    // evaluated expression fixes that without writing to the page's globals -
    // which the earlier version did, and which broke on any site shipping its
    // own esbuild bundle, since __name was already defined and not ours.
    const facts = await page.evaluate<Omit<PageFacts, 'url'>>(
      `(() => { const __name = (f) => f; return (${collectFacts.toString()})(); })()`
    );

    // A screenshot is what the human labeller actually judges. The score is
    // derived from CSS; the label has to come from looking, or the two are
    // not independent and the correlation means nothing.
    let screenshot: string | undefined;
    if (opts.shot) {
      mkdirSync('data/shots', { recursive: true });
      screenshot = `data/shots/${slug(url)}.jpg`;
      await page.screenshot({ path: screenshot, type: 'jpeg', quality: 72 });
    }

    await page.close();
    return { ...scoreFacts({ ...facts, url }), screenshot };
  } finally {
    if (own) await b.close();
  }
}

export { launch };
