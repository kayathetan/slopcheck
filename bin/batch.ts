import { analyse, launch } from '../src/analyse.js';
import { appendFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

/**
 * Runs the detector over a corpus and writes one JSON object per line.
 *
 * This is the half that makes the thing a research artifact rather than a
 * toy: a JSONL of facts, signals, score and a screenshot is what you later
 * join against your own labels, to ask whether a metric derived from CSS
 * predicts what a person with an eye actually says.
 *
 *   npm run batch -- data/corpus.txt
 *   npm run batch -- linear.app stripe.com
 */
const args = process.argv.slice(2);
const urls = args.length === 1 && existsSync(args[0])
  ? readFileSync(args[0], 'utf8').split('\n').map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  : args;

const out = 'data/results.jsonl';
writeFileSync(out, '');
const browser = await launch();
console.log(`\n  ${urls.length} sites\n\n  ${'score'.padStart(5)}  ${'verdict'.padEnd(18)} site\n`);

let done = 0;
for (const raw of urls) {
  const url = raw.startsWith('http') ? raw : 'https://' + raw;
  const host = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  try {
    const r = await analyse(url, browser, { shot: true });
    appendFileSync(out, JSON.stringify(r) + '\n');
    console.log(`  ${String(r.slopScore).padStart(5)}  ${r.verdict.padEnd(18)} ${host}`);
    done++;
  } catch (e) {
    console.log(`  ${'--'.padStart(5)}  ${'failed'.padEnd(18)} ${host}  ${(e as Error).message.slice(0, 44)}`);
  }
}
await browser.close();
console.log(`\n  ${done}/${urls.length} analysed -> ${out}\n`);
