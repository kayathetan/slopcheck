/**
 * Tailwind's default palette, as the rgb() strings getComputedStyle returns.
 *
 * Using one of these EXACTLY is the strongest single tell available, because
 * it means nobody opened a colour picker. A designer who starts from
 * violet-500 almost always nudges it; a generated page ships the literal
 * default. Only the shades that actually get used as accents and grounds are
 * listed - the full ramp would add noise without adding signal.
 */
export const TAILWIND_DEFAULTS: Record<string, string> = {
  'rgb(99, 102, 241)': 'indigo-500',
  'rgb(79, 70, 229)': 'indigo-600',
  'rgb(67, 56, 202)': 'indigo-700',
  'rgb(139, 92, 246)': 'violet-500',
  'rgb(124, 58, 237)': 'violet-600',
  'rgb(109, 40, 217)': 'violet-700',
  'rgb(168, 85, 247)': 'purple-500',
  'rgb(147, 51, 234)': 'purple-600',
  'rgb(59, 130, 246)': 'blue-500',
  'rgb(37, 99, 235)': 'blue-600',
  'rgb(29, 78, 216)': 'blue-700',
  'rgb(14, 165, 233)': 'sky-500',
  'rgb(6, 182, 212)': 'cyan-500',
  'rgb(20, 184, 166)': 'teal-500',
  'rgb(16, 185, 129)': 'emerald-500',
  'rgb(34, 197, 94)': 'green-500',
  'rgb(234, 179, 8)': 'yellow-500',
  'rgb(245, 158, 11)': 'amber-500',
  'rgb(249, 115, 22)': 'orange-500',
  'rgb(239, 68, 68)': 'red-500',
  'rgb(244, 63, 94)': 'rose-500',
  'rgb(236, 72, 153)': 'pink-500',
  // neutrals - the grounds and body copy
  'rgb(248, 250, 252)': 'slate-50',
  'rgb(241, 245, 249)': 'slate-100',
  'rgb(148, 163, 184)': 'slate-400',
  'rgb(100, 116, 139)': 'slate-500',
  'rgb(71, 85, 105)': 'slate-600',
  'rgb(51, 65, 85)': 'slate-700',
  'rgb(30, 41, 59)': 'slate-800',
  'rgb(15, 23, 42)': 'slate-900',
  'rgb(249, 250, 251)': 'gray-50',
  'rgb(156, 163, 175)': 'gray-400',
  'rgb(107, 114, 128)': 'gray-500',
  'rgb(75, 85, 99)': 'gray-600',
  'rgb(55, 65, 81)': 'gray-700',
  'rgb(31, 41, 55)': 'gray-800',
  'rgb(17, 24, 39)': 'gray-900',
  'rgb(24, 24, 27)': 'zinc-900',
  'rgb(23, 23, 23)': 'neutral-900',
  'rgb(28, 25, 23)': 'stone-900',
};

/** Typefaces that a generated page reaches for by default. */
export const DEFAULT_FACES = [
  'Inter',
  'Space Grotesk',
  'Poppins',
  'Montserrat',
  'DM Sans',
  'Plus Jakarta Sans',
  'Manrope',
  'Geist',
];
