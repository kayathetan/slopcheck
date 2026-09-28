import { createServer } from 'node:http';
import { readFileSync, existsSync, appendFileSync } from 'node:fs';

/**
 * Pairwise labelling.
 *
 * Deliberately NOT a 1-10 slider. People are unreliable at absolute
 * aesthetic scores - the scale drifts within a session and means different
 * things on different days - and reliable at "which of these two". The
 * ranking is reconstructed afterwards from the comparisons, which is the
 * same reason preference models are trained on pairs rather than ratings.
 *
 * The question is "which looks more HAND-MADE", not "which is better".
 * Those come apart, and the gap between them is the interesting result:
 * a beautiful page built strictly from a design system should read as less
 * hand-made while being the better design.
 */
const results = readFileSync('data/results.jsonl', 'utf8').trim().split('\n')
  .filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.screenshot);

const LOG = 'data/comparisons.jsonl';
const seen = () => existsSync(LOG)
  ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : [];

/** Pick two the labeller has not already compared. */
function pair() {
  const done = new Set(seen().map((c: any) => [c.a, c.b].sort().join('|')));
  const pool: [any, any][] = [];
  for (let i = 0; i < results.length; i++)
    for (let j = i + 1; j < results.length; j++)
      if (!done.has([results[i].url, results[j].url].sort().join('|'))) pool.push([results[i], results[j]]);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

const page = (a: any, b: any, n: number, left: number) => `<!doctype html>
<meta charset="utf-8"><title>label</title>
<style>
  :root{--ink:#14131a;--paper:#fbfbfd;--line:#e5e4ea;--accent:#2d5f5d}
  @media(prefers-color-scheme:dark){:root{--ink:#f2f1f6;--paper:#121116;--line:#2b2932;--accent:#7fb8b3}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font:15px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;
    display:flex;flex-direction:column;min-height:100vh}
  header{padding:18px 24px;border-bottom:1px solid var(--line);
    display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
  h1{font-size:15px;font-weight:600;margin:0;letter-spacing:-.01em}
  .n{font:12px ui-monospace,Menlo,monospace;color:var(--accent)}
  .grid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line);min-height:0}
  .card{background:var(--paper);display:flex;flex-direction:column;cursor:pointer;overflow:hidden;
    border:3px solid transparent;transition:border-color .12s}
  .card:hover{border-color:var(--accent)}
  .card img{width:100%;flex:1;object-fit:cover;object-position:top;min-height:0}
  .meta{padding:10px 14px;display:flex;justify-content:space-between;gap:12px;
    font:12px ui-monospace,Menlo,monospace;color:var(--ink);opacity:.62}
  .key{border:1px solid var(--line);border-radius:3px;padding:1px 6px}
  footer{padding:14px 24px;border-top:1px solid var(--line);display:flex;gap:18px;
    align-items:center;font-size:13px;opacity:.7;flex-wrap:wrap}
  button{font:inherit;background:none;border:1px solid var(--line);border-radius:4px;
    padding:6px 14px;color:inherit;cursor:pointer}
  @media(max-width:760px){.grid{grid-template-columns:1fr}}
</style>
<header>
  <h1>Which looks more <em>hand-made</em>?</h1>
  <span class="n">${n} judged · ${left} pairs left</span>
</header>
<div class="grid">
  <form method="post" action="/pick" class="card" onclick="this.submit()">
    <input type="hidden" name="winner" value="${encodeURIComponent(a.url)}">
    <input type="hidden" name="loser" value="${encodeURIComponent(b.url)}">
    <img src="/shot?u=${encodeURIComponent(a.url)}" alt="">
    <div class="meta"><span>${new URL(a.url).hostname}</span><span class="key">←</span></div>
  </form>
  <form method="post" action="/pick" class="card" onclick="this.submit()">
    <input type="hidden" name="winner" value="${encodeURIComponent(b.url)}">
    <input type="hidden" name="loser" value="${encodeURIComponent(a.url)}">
    <img src="/shot?u=${encodeURIComponent(b.url)}" alt="">
    <div class="meta"><span>${new URL(b.url).hostname}</span><span class="key">→</span></div>
  </form>
</div>
<footer>
  <form method="post" action="/skip"><button>can't tell / skip <span class="key">space</span></button></form>
  <span>scores are hidden on purpose — judge the picture, not the number</span>
</footer>
<script>
  const forms=[...document.querySelectorAll('.card')];
  addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft')forms[0].submit();
    if(e.key==='ArrowRight')forms[1].submit();
    if(e.key===' '){e.preventDefault();document.querySelector('footer form').submit();}
  });
</script>`;

const body = (req: any) => new Promise<string>((res) => {
  let d = ''; req.on('data', (c: any) => (d += c)); req.on('end', () => res(d));
});

createServer(async (req, res) => {
  const u = new URL(req.url!, 'http://x');

  if (u.pathname === '/shot') {
    const r = results.find((x) => x.url === u.searchParams.get('u'));
    if (r && existsSync(r.screenshot)) {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      return res.end(readFileSync(r.screenshot));
    }
    res.writeHead(404); return res.end();
  }

  if (req.method === 'POST') {
    if (u.pathname === '/pick') {
      const p = new URLSearchParams(await body(req));
      appendFileSync(LOG, JSON.stringify({
        winner: decodeURIComponent(p.get('winner')!),
        loser: decodeURIComponent(p.get('loser')!),
        a: decodeURIComponent(p.get('winner')!),
        b: decodeURIComponent(p.get('loser')!),
        at: new Date().toISOString(),
      }) + '\n');
    }
    res.writeHead(302, { location: '/' }); return res.end();
  }

  const p = pair();
  if (!p) { res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<body style="font:16px system-ui;padding:40px">every pair judged — run <code>npm run rank</code></body>'); }
  const total = (results.length * (results.length - 1)) / 2;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page(p[0], p[1], seen().length, total - seen().length));
}).listen(4321, () => console.log('\n  labelling at http://localhost:4321\n  ← more hand-made · → more hand-made · space to skip\n'));
