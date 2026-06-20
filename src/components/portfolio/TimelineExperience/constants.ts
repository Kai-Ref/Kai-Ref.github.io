export const DESKTOP_BREAKPOINT = 768;
export const MOBILE_DESKTOP_HINT = 'Best experienced on a wider screen.';

export function shouldUseMobileTimeline(viewportWidth: number) {
  return viewportWidth < DESKTOP_BREAKPOINT;
}

export function abbreviateTimelineRailLabel(label: string) {
  const parenMatch = label.match(/\(([A-Z]{2,})\)/);
  if (parenMatch) {
    if (/Fraunhofer/i.test(label)) return `Fraunhofer ${parenMatch[1]}`;
    return parenMatch[1];
  }

  const commaSegments = label.split(',').map((segment) => segment.trim()).filter(Boolean);
  const commaUppercase = commaSegments.find((segment) => /^[A-Z]{2,}$/.test(segment));
  if (commaUppercase) return commaUppercase;

  const beforeComma = label.split(',')[0]?.trim() ?? label;
  const words = beforeComma.split(/\s+/).filter(Boolean);

  if (words.length === 1) return words[0];

  if (/^University of /i.test(beforeComma)) {
    return beforeComma.replace(/^University of /i, '').trim();
  }

  const uppercaseToken = words.find((word) => /^[A-Z]{2,}$/.test(word));
  if (uppercaseToken) return uppercaseToken;

  return words.slice(0, 2).join(' ');
}

export function getMobileJumpOffset(navHeight: number) {
  return navHeight + 156;
}

export const TIMELINE_TOTAL_VH_MULTIPLIER = 100;
export const TIMELINE_ZONE = {
  rail: '20%',
  card: '80%',
} as const;

export const RAIL_GEOMETRY = {
  padLeft: 24,
  padRight: 84,
  rangeStartX: 200,
  labelEndX: 184,
  trackGap: 84,
} as const;

export const TRACK_COLORS = {
  education: 'var(--edu-color)',
  professional: 'var(--pro-color)',
} as const;

export const TRACK_COLORS_SOFT = {
  education: 'var(--edu-soft)',
  professional: 'var(--pro-soft)',
} as const;

export const NEUTRAL_COLORS = {
  line: 'var(--text-light)',
  border: 'var(--border-color)',
  cardBg: 'rgba(255,255,255,0.96)',
  mutedBg: 'rgba(255,255,255,0.7)',
} as const;

export const CITY_IMAGES: Record<string, string> = {
  karlsruhe: '/images/cities/karlsruhe.webp',
  mannheim: '/images/cities/mannheim.webp',
  darmstadt: '/images/cities/darmstadt.webp',
  adelaide: '/images/cities/adelaide.webp',
  frankfurt: '/images/cities/frankfurt.webp',
};

export const TRACK_LAYOUT = {
  startX: 0.1,
  endX: 0.985,
  stubStart: 0.04,
  stubEnd: 0.12,
  labelX: 0.012,
  upperY: 0.34,
  lowerY: 0.68,
  splitY: 0.51,
  yearY: 0.9,
} as const;
