/** Raw design facts collected from a rendered page. No judgement here. */
export interface PageFacts {
  url: string;
  title: string;
  /** computed font-family stacks, by how many elements use them */
  fontFamilies: Record<string, number>;
  fontWeights: Record<string, number>;
  /** font-size in px, as a string key so 13.5 and 14 stay distinct */
  fontSizes: Record<string, number>;
  /** letter-spacing per font-size, to see whether tracking is tuned by size */
  trackingBySize: Record<string, string[]>;
  colors: Record<string, number>;
  backgrounds: Record<string, number>;
  radii: Record<string, number>;
  shadows: Record<string, number>;
  gridTemplates: Record<string, number>;
  /** class attribute tokens, for framework fingerprinting */
  classTokens: Record<string, number>;
  headingText: string[];
  gradientTextCount: number;
  elementCount: number;
  webfonts: string[];
}

export type Verdict = 'human' | 'leaning-human' | 'unclear' | 'leaning-generated' | 'generated';

export interface Signal {
  id: string;
  label: string;
  /** -1 = strong evidence of human tuning, +1 = strong evidence of defaults */
  score: number;
  weight: number;
  /** what was actually observed, quoted so the finding is checkable */
  evidence: string;
}

export interface Report {
  url: string;
  title: string;
  fetchedAt: string;
  /** 0 = unmistakably hand-tuned, 100 = unmistakably default */
  slopScore: number;
  verdict: Verdict;
  signals: Signal[];
  facts: PageFacts;
  /** path to the above-the-fold capture the human labeller judges */
  screenshot?: string;
}
