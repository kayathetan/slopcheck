import { readFileSync, existsSync } from 'node:fs';

/**
 * Turns pairwise judgements into a ranking, then asks the actual research
 * question: does a score computed from CSS predict what a person says?
 *
 * Bradley-Terry rather than a win-rate, because win-rate is confounded by
 * who you happened to be compared against. Beating shadcn.com tells you
 * less than beating Linear, and BT accounts for that.
 */
type Cmp = { winner: string; loser: string };

const results = readFileSync('data/results.jsonl', 'utf8').trim().split('\n')
  .filter(Boolean).map((l) => JSON.parse(l));
if (!existsSync('data/comparisons.jsonl')) {
  console.error('\n  no comparisons yet - run `npm run label` first\n'); process.exit(1);
}
const cmps: Cmp[] = readFileSync('data/comparisons.jsonl', 'utf8').trim().split('\n')
  .filter(Boolean).map((l) => JSON.parse(l));

const urls = [...new Set(cmps.flatMap((c) => [c.winner, c.loser]))];
const idx = new Map(urls.map((u, i) => [u, i]));
const n = urls.length;

// wins[i][j] = times i beat j
const wins = Array.from({ length: n }, () => new Array(n).fill(0));
for (const c of cmps) wins[idx.get(c.winner)!][idx.get(c.loser)!]++;

/** Bradley-Terry by MM iteration. */
let p = new Array(n).fill(1);
for (let it = 0; it < 500; it++) {
  const next = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const W = wins[i].reduce((a, b) => a + b, 0);
    let denom = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const nij = wins[i][j] + wins[j][i];
      if (nij) denom += nij / (p[i] + p[j]);
    }
    next[i] = denom ? W / denom : p[i];
  }
  const mean = next.reduce((a, b) => a + b, 0) / n;
  p = next.map((v) => v / (mean || 1));
}

const rank = (xs: number[]) => {
  const order = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  order.forEach(([, i], k) => (r[i as number] = k + 1));
  return r;
};
const spearman = (a: number[], b: number[]) => {
  const ra = rank(a), rb = rank(b), m = a.length;
  const d2 = ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0);
  return 1 - (6 * d2) / (m * (m * m - 1));
};

const rows = urls.map((u, i) => {
  const r = results.find((x) => x.url === u);
  return { url: u, host: new URL(u).hostname, human: p[i], slop: r?.slopScore ?? NaN, signals: r?.signals ?? [] };
}).filter((r) => !isNaN(r.slop));

// human strength is "more hand-made"; slopScore is "more default" - so a
// working detector produces a NEGATIVE correlation.
const rho = spearman(rows.map((r) => r.human), rows.map((r) => r.slop));

console.log(`\n  ${cmps.length} comparisons over ${rows.length} sites\n`);
console.log(`  Spearman(human "hand-made" rank, slopScore) = ${rho.toFixed(3)}`);
console.log(`  ${rho < -0.6 ? 'strong agreement' : rho < -0.3 ? 'moderate agreement' : rho < 0 ? 'weak agreement' : 'NO agreement - the detector is not measuring what you see'}\n`);

console.log(`  ${'rank'.padStart(4)}  ${'host'.padEnd(28)}${'BT'.padStart(7)}${'slop'.padStart(7)}`);
for (const r of [...rows].sort((a, b) => b.human - a.human)) {
  console.log(`  ${''.padStart(4)}  ${r.host.padEnd(28)}${r.human.toFixed(2).padStart(7)}${String(r.slop).padStart(7)}`);
}

// Which single signal tracks the human read best? This is the finding.
console.log(`\n  per-signal agreement with your eye:\n`);
const ids = [...new Set(rows.flatMap((r) => r.signals.map((s: any) => s.id)))];
const perSignal = ids.map((id) => {
  const sub = rows.filter((r) => r.signals.some((s: any) => s.id === id));
  if (sub.length < 5) return null;
  const sc = sub.map((r) => r.signals.find((s: any) => s.id === id).score);
  return { id, rho: spearman(sub.map((r) => r.human), sc), n: sub.length };
}).filter(Boolean).sort((a: any, b: any) => a.rho - b.rho);
for (const s of perSignal as any[]) {
  console.log(`   ${s.id.padEnd(18)} ${s.rho.toFixed(3).padStart(7)}   (n=${s.n})`);
}
console.log();
