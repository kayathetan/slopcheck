import { analyse } from '../src/analyse.js';

const url = process.argv[2];
if (!url) { console.error('usage: npm run check -- <url>'); process.exit(1); }

const r = await analyse(url.startsWith('http') ? url : 'https://' + url);

const bar = (n: number) => {
  const filled = Math.round(n / 5);
  return '█'.repeat(filled) + '░'.repeat(20 - filled);
};

console.log(`\n  ${r.title}`);
console.log(`  ${r.url}\n`);
console.log(`  ${bar(r.slopScore)}  ${r.slopScore}/100   ${r.verdict.toUpperCase().replace('-', ' ')}\n`);
console.log('  evidence, strongest tell first:\n');
for (const s of r.signals) {
  const mark = s.score > 0.3 ? '▲' : s.score < -0.3 ? '▼' : '·';
  console.log(`   ${mark} ${s.label.padEnd(22)} ${s.evidence}`);
}
console.log('\n  ▲ default   ▼ hand-tuned\n');
