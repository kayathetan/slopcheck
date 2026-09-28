import type { PageFacts } from './types.js';

/**
 * Runs INSIDE the page. Collects raw facts only - no scoring, no opinions.
 *
 * Everything here comes from getComputedStyle rather than the stylesheet,
 * because the question is what a visitor actually sees. A site can declare
 * a variable type scale and still render four sizes.
 */
export function collectFacts(): Omit<PageFacts, 'url'> {
  const bump = (m: Record<string, number>, k: string) => {
    if (k) m[k] = (m[k] || 0) + 1;
  };

  const fontFamilies: Record<string, number> = {};
  const fontWeights: Record<string, number> = {};
  const fontSizes: Record<string, number> = {};
  const trackingBySize: Record<string, string[]> = {};
  const colors: Record<string, number> = {};
  const backgrounds: Record<string, number> = {};
  const radii: Record<string, number> = {};
  const shadows: Record<string, number> = {};
  const gridTemplates: Record<string, number> = {};
  const classTokens: Record<string, number> = {};
  const headingText: string[] = [];
  let gradientTextCount = 0;

  const els = Array.from(document.body.querySelectorAll('*'));

  for (const el of els) {
    const cs = getComputedStyle(el);

    // Only count type facts for elements that actually render text, or a
    // page of empty divs would drown the real signal.
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent || '')
      .join('')
      .trim();

    if (ownText.length > 1) {
      bump(fontFamilies, cs.fontFamily);
      bump(fontWeights, cs.fontWeight);
      const size = parseFloat(cs.fontSize).toString();
      bump(fontSizes, size);
      (trackingBySize[size] ||= []).push(cs.letterSpacing);
      bump(colors, cs.color);
    }

    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      bump(backgrounds, cs.backgroundColor);
    }
    if (cs.borderRadius && cs.borderRadius !== '0px') bump(radii, cs.borderRadius);
    if (cs.boxShadow && cs.boxShadow !== 'none') bump(shadows, cs.boxShadow);
    if (cs.display === 'grid' && cs.gridTemplateColumns) {
      bump(gridTemplates, cs.gridTemplateColumns);
    }
    // Gradient-filled text: a near-universal tell when combined with others.
    if (
      (cs.webkitBackgroundClip === 'text' || (cs as any).backgroundClip === 'text') &&
      cs.backgroundImage.includes('gradient')
    ) {
      gradientTextCount++;
    }

    if (typeof el.className === 'string') {
      for (const t of el.className.split(/\s+/)) if (t) bump(classTokens, t);
    }
    if (/^H[1-3]$/.test(el.tagName)) {
      const t = (el.textContent || '').trim();
      if (t) headingText.push(t.slice(0, 120));
    }
  }

  const webfonts = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => (l as HTMLLinkElement).href)
    .filter((h) => /fonts\.googleapis|typekit|fonts\.bunny|use\.typekit/.test(h));

  return {
    title: document.title,
    fontFamilies,
    fontWeights,
    fontSizes,
    trackingBySize,
    colors,
    backgrounds,
    radii,
    shadows,
    gridTemplates,
    classTokens,
    headingText,
    gradientTextCount,
    elementCount: els.length,
    webfonts,
  };
}
