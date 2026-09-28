import type { PageFacts, Signal, Report, Verdict } from './types.js';
import { TAILWIND_DEFAULTS, DEFAULT_FACES } from './palette.js';
import { TW_FONT_SIZES_PX, TW_TRACKING_EM, TW_RADII_PX, near, toEm, radiusValues } from './scales.js';

const total = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
const topKey = (m: Record<string, number>) =>
  Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

/**
 * Every detector asks the same question: what share of these values sit ON
 * the framework's default scale, and what share sit off it?
 *
 *   +1  entirely on-scale - nothing was chosen
 *   -1  substantially off-scale - somebody was looking at the screen
 *
 * The curve is deliberately steep, and the first calibration got this wrong
 * by treating it as linear. A generated page has almost EXACTLY zero
 * off-scale values - that is what "generated" means. So the interesting
 * range is 0-25%, not 0-100%: Linear's 31% of text at 10, 11, 13 and 15px
 * is not "somewhat tuned", it is a type scale built by hand, and the first
 * version scored it as leaning-default.
 *
 * `sensitivity` exists because not every property is equally deliberate.
 * Radius drifts off-scale on its own through calc() on a CSS variable -
 * shadcn's 5, 10, 14, 18px all fall out of `calc(var(--radius) - 2px)`
 * without anyone choosing them - so it needs a gentler slope than type,
 * where every off-scale value was typed by a person.
 */
const fromOffRate = (offRate: number, sensitivity = 8) =>
  Math.max(-1, Math.min(1, 1 - offRate * sensitivity));

function weightSignal(f: PageFacts): Signal {
  const ws = Object.entries(f.fontWeights)
    .map(([w, n]) => [Number(w), n] as const)
    .filter(([w]) => !isNaN(w));
  const off = ws.filter(([w]) => w % 100 !== 0);
  const offRate = total(f.fontWeights) ? off.reduce((a, [, n]) => a + n, 0) / total(f.fontWeights) : 0;
  return {
    id: 'font-weight',
    label: 'Font weights',
    score: off.length ? -1 : 0.9,
    weight: 3,
    evidence: off.length
      ? `${off.map(([w]) => w).sort((a, b) => a - b).join(', ')} - variable-font intermediates, off the 100-step scale`
      : `only ${ws.map(([w]) => w).sort((a, b) => a - b).join(', ')} - every weight is a round default`,
  };
}

function sizeSignal(f: PageFacts): Signal {
  const entries = Object.entries(f.fontSizes).map(([s, n]) => [parseFloat(s), n] as const);
  const used = total(f.fontSizes);
  const offCount = entries.filter(([s]) => !near(s, TW_FONT_SIZES_PX, 0.4)).reduce((a, [, n]) => a + n, 0);
  const offRate = used ? offCount / used : 0;
  const offSizes = entries.filter(([s]) => !near(s, TW_FONT_SIZES_PX, 0.4)).map(([s]) => s).sort((a, b) => a - b);
  return {
    id: 'font-size',
    label: 'Type scale',
    score: fromOffRate(offRate),
    weight: 3,
    evidence: offSizes.length
      ? `${Math.round(offRate * 100)}% of text is off the default scale (${offSizes.slice(0, 6).map((n) => +n.toFixed(1)).join(', ')}px)`
      : `every size sits on the default scale: ${entries.map(([s]) => s).sort((a, b) => a - b).join(', ')}px`,
  };
}

function trackingSignal(f: PageFacts): Signal {
  let on = 0, off = 0;
  const offVals: number[] = [];
  for (const [sizeStr, vals] of Object.entries(f.trackingBySize)) {
    const size = parseFloat(sizeStr);
    for (const v of vals) {
      if (!v || v === 'normal') { on++; continue; }
      const em = toEm(parseFloat(v), size);
      if (isNaN(em)) continue;
      if (near(em, TW_TRACKING_EM, 0.004)) on++;
      else { off++; offVals.push(em); }
    }
  }
  const offRate = on + off ? off / (on + off) : 0;
  const uniq = [...new Set(offVals.map((e) => +e.toFixed(3)))];
  return {
    id: 'tracking',
    label: 'Letter-spacing',
    score: fromOffRate(offRate),
    weight: 3,
    evidence: uniq.length
      ? `${Math.round(offRate * 100)}% off-scale tracking (${uniq.slice(0, 5).map((e) => `${e}em`).join(', ')}) - nudged by eye`
      : 'all tracking is normal or a stock utility value',
  };
}

function radiusSignal(f: PageFacts): Signal {
  let on = 0, off = 0;
  const offVals: number[] = [];
  for (const [decl, n] of Object.entries(f.radii)) {
    for (const v of radiusValues(decl)) {
      if (near(v, TW_RADII_PX, 0.5)) on += n;
      else { off += n; offVals.push(v); }
    }
  }
  const offRate = on + off ? off / (on + off) : 0;
  const uniq = [...new Set(offVals)].sort((a, b) => a - b);
  return {
    id: 'radius',
    label: 'Corner radius',
    score: fromOffRate(offRate, 3),
    weight: 2,
    evidence: uniq.length
      ? `${Math.round(offRate * 100)}% off-scale radii (${uniq.slice(0, 5).join(', ')}px)`
      : 'every radius is a stock value',
  };
}

function paletteSignal(f: PageFacts): Signal {
  const all = { ...f.colors, ...f.backgrounds };
  const names: string[] = [];
  let hits = 0;
  for (const [c, n] of Object.entries(all)) {
    const name = TAILWIND_DEFAULTS[c];
    if (name) { hits += n; if (!names.includes(name)) names.push(name); }
  }
  const share = total(all) ? hits / total(all) : 0;
  return {
    id: 'palette',
    label: 'Colour',
    score: names.length >= 3 ? 1 : names.length ? 0.4 : -0.5,
    weight: 2,
    evidence: names.length
      ? `${names.length} unmodified Tailwind defaults (${names.slice(0, 5).join(', ')}) on ${Math.round(share * 100)}% of coloured elements`
      : 'no literal Tailwind defaults',
  };
}

function typefaceSignal(f: PageFacts): Signal {
  const primary = topKey(f.fontFamilies);
  const hit = DEFAULT_FACES.find((n) => primary.includes(n));
  const stacks = Object.keys(f.fontFamilies).length;
  return {
    id: 'typeface',
    label: 'Typeface',
    score: hit ? (stacks <= 2 ? 0.9 : 0.4) : -0.6,
    weight: 2,
    evidence: hit
      ? `${hit}${stacks <= 2 ? ', and nothing else' : `, one of ${stacks} stacks`}`
      : `${primary.split(',')[0]?.replace(/["']/g, '') || 'unset'} - not a default pick`,
  };
}

function gradientTextSignal(f: PageFacts): Signal {
  const n = f.gradientTextCount;
  return { id: 'gradient-text', label: 'Gradient text', score: n >= 2 ? 1 : 0.5,
    weight: n ? 1 : 0, evidence: `${n} element(s) with gradient-filled text` };
}

function emojiHeadingSignal(f: PageFacts): Signal {
  const hits = f.headingText.filter((t) => /\p{Extended_Pictographic}/u.test(t));
  return { id: 'emoji-headings', label: 'Emoji in headings', score: hits.length >= 2 ? 1 : 0.5,
    weight: hits.length ? 2 : 0, evidence: hits.slice(0, 2).map((h) => `"${h}"`).join(', ') };
}

function shadcnSignal(f: PageFacts): Signal {
  const toks = Object.keys(f.classTokens);
  const markers = toks.filter((t) => /^(ring-offset|data-\[state|peer-|group-)/.test(t));
  const tw = toks.filter((t) =>
    /^(bg|text|border|rounded|shadow|flex|grid|gap|p[xytblr]?|m[xytblr]?|max-w|space-[xy]|items|justify|font|leading|tracking)-/.test(t));
  const share = toks.length ? tw.length / toks.length : 0;
  return {
    id: 'utility-classes',
    label: 'Utility CSS',
    score: share > 0.5 ? 0.8 : share > 0.2 ? 0.4 : -0.3,
    weight: 1,
    evidence: `${Math.round(share * 100)}% Tailwind utility class names${markers.length ? ', shadcn component markers' : ''}`,
  };
}

export function scoreFacts(facts: PageFacts): Report {
  const signals = [
    weightSignal(facts), sizeSignal(facts), trackingSignal(facts), radiusSignal(facts),
    paletteSignal(facts), typefaceSignal(facts), gradientTextSignal(facts),
    emojiHeadingSignal(facts), shadcnSignal(facts),
  ].filter((s) => s.weight > 0);

  const w = signals.reduce((a, s) => a + s.weight, 0);
  const raw = signals.reduce((a, s) => a + s.score * s.weight, 0) / (w || 1);
  const slopScore = Math.round(((raw + 1) / 2) * 100);

  const verdict: Verdict =
    slopScore >= 72 ? 'generated' : slopScore >= 58 ? 'leaning-generated'
    : slopScore >= 42 ? 'unclear' : slopScore >= 28 ? 'leaning-human' : 'human';

  return { url: facts.url, title: facts.title, fetchedAt: new Date().toISOString(),
    slopScore, verdict, signals: signals.sort((a, b) => b.score * b.weight - a.score * a.weight), facts };
}
