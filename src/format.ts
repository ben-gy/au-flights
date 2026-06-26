// Pure formatting + classification helpers. Unit-tested in tests/format.test.ts.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format an integer with locale thousands separators. */
export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a percentage value (already 0–100) with a % sign. */
export function formatPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

/** Compact large numbers: 1234567 -> "1.2M". */
export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(n));
}

/** "2026-05" -> "May 2026". */
export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTHS[m - 1]} ${y}`;
}

/** Month number 1–12 -> "January". */
export function monthName(m: number): string {
  return MONTHS_LONG[m - 1] ?? String(m);
}

/** Short month 1–12 -> "Jan". */
export function monthShort(m: number): string {
  return MONTHS[m - 1] ?? String(m);
}

export type Band = 'good' | 'ok' | 'poor';

/** Classify an on-time arrival % into a performance band. */
export function otpBand(pct: number | null | undefined): Band {
  if (pct === null || pct === undefined) return 'ok';
  if (pct >= 80) return 'good';
  if (pct >= 70) return 'ok';
  return 'poor';
}

/** Classify a cancellation rate % into a band (lower is better). */
export function cancelBand(pct: number | null | undefined): Band {
  if (pct === null || pct === undefined) return 'ok';
  if (pct < 2) return 'good';
  if (pct < 4) return 'ok';
  return 'poor';
}

export const BAND_COLOR: Record<Band, string> = {
  good: '#16a34a',
  ok: '#d97706',
  poor: '#dc2626',
};

/** Colour for an on-time % on the green→amber→red scale. */
export function otpColor(pct: number | null | undefined): string {
  return BAND_COLOR[otpBand(pct)];
}

export function cancelColor(pct: number | null | undefined): string {
  return BAND_COLOR[cancelBand(pct)];
}

/** Continuous green→amber→red scale for an on-time % (55–90 clamp). */
export function otpHeatColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '#e5e7eb';
  const clamped = Math.max(55, Math.min(90, pct));
  const t = (clamped - 55) / 35;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const u = t / 0.5;
    r = 220 + (217 - 220) * u;
    g = 38 + (119 - 38) * u;
    b = 38 + (6 - 38) * u;
  } else {
    const u = (t - 0.5) / 0.5;
    r = 217 + (22 - 217) * u;
    g = 119 + (163 - 119) * u;
    b = 6 + (74 - 6) * u;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** Turn an arbitrary string into a slug usable in a URL hash. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Escape text for safe insertion into innerHTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Debounce a function by `ms` milliseconds. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
