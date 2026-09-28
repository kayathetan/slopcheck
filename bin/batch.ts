import { analyse, launch } from '../src/analyse.js';
import { appendFileSync, writeFileSync } from 'node:fs';

/**
 * Runs the detector over a list of URLs and writes one JSON object per line.
 *
 * This is the half that makes the thing a research artifact rather than a
 * toy: a JSONL of facts + signals + score is what you later join against
 * your own labels, to ask whether the heuristics agree with a human eye.
 */
const urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = 'results.jsonl';
writeFileSync(out, '');

const browser = await launch();
console.log(`\n  ${'score'.padStart(5)}  ${'verdict'.padEnd(18)} site\n`);

for (const raw of urls) {
  const url = raw.startsWith('http') ? raw : 'https://' + raw;
  try {
    const r = await analyse(url, browser);
    appendFileSync(out, JSON.stringify(r) + '\n');
    console.log(`  ${String(r.slopScore).padStart(5)}  ${r.verdict.padEnd(18)} ${new URL(url).hostname}`);
  } catch (e) {
    console.log(`  ${'--'.padStart(5)}  ${'failed'.padEnd(18)} ${new URL(url).hostname}  ${(e as Error).message.slice(0, 50)}`);
  }
}
await browser.close();
console.log(`\n  wrote ${out}\n`);
