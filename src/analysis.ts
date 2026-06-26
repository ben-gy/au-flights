// Auto-detected insights from the aggregated data. Pure functions, unit-tested.
import type { AppData, Airline, Route, NationalPoint } from './types.ts';

export type Severity = 'alert' | 'warn' | 'info' | 'good';

export interface Insight {
  severity: Severity;
  title: string;
  detail: string;
  /** Optional hash to deep-link the relevant view. */
  link?: string;
}

export function median(values: number[]): number {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Routes worth flying for ≥300 sectors in the recent window, with a real OTP figure. */
function eligibleRoutes(routes: Route[]): Route[] {
  return routes.filter((r) => r.recent12.flown >= 300 && r.recent12.otpArr !== null);
}

export function worstRoutes(routes: Route[], n = 5): Route[] {
  return [...eligibleRoutes(routes)]
    .sort((a, b) => (a.recent12.otpArr ?? 0) - (b.recent12.otpArr ?? 0))
    .slice(0, n);
}

export function bestRoutes(routes: Route[], n = 5): Route[] {
  return [...eligibleRoutes(routes)]
    .sort((a, b) => (b.recent12.otpArr ?? 0) - (a.recent12.otpArr ?? 0))
    .slice(0, n);
}

export function mostCancelledRoutes(routes: Route[], n = 5): Route[] {
  return [...eligibleRoutes(routes)]
    .sort((a, b) => (b.recent12.cancelRate ?? 0) - (a.recent12.cancelRate ?? 0))
    .slice(0, n);
}

/** Compare each active airline's most recent 12-month OTP to its prior 12 months. */
export function airlineTrend(a: Airline): { recent: number; prior: number; delta: number } | null {
  const s = a.series.filter((p) => p.otpArr !== null);
  if (s.length < 24) return null;
  const recent12 = s.slice(-12);
  const prior12 = s.slice(-24, -12);
  const avg = (xs: typeof s) =>
    xs.reduce((sum, p) => sum + (p.otpArr ?? 0), 0) / xs.length;
  const recent = avg(recent12);
  const prior = avg(prior12);
  return { recent, prior, delta: recent - prior };
}

/** Find the single worst cancellation month nationally. */
export function worstCancelMonth(series: NationalPoint[]): NationalPoint | null {
  let worst: NationalPoint | null = null;
  for (const p of series) {
    if (p.cancelRate === null) continue;
    if (!worst || (p.cancelRate ?? 0) > (worst.cancelRate ?? 0)) worst = p;
  }
  return worst;
}

export function buildInsights(data: AppData): Insight[] {
  const out: Insight[] = [];
  const { routes, airlines, summary, national } = data;

  // 1. Industry headline vs the long-run average.
  const rec = summary.recent12National.otpArr;
  const all = summary.allTimeNational.otpArr;
  if (rec !== null && all !== null) {
    const delta = rec - all;
    out.push({
      severity: delta < -3 ? 'warn' : delta > 3 ? 'good' : 'info',
      title: `Industry on-time rate is ${rec.toFixed(1)}% over the last year`,
      detail:
        delta >= 0
          ? `That is ${delta.toFixed(1)} points above the 22-year average of ${all.toFixed(1)}% — punctuality is running better than usual.`
          : `That is ${Math.abs(delta).toFixed(1)} points below the 22-year average of ${all.toFixed(1)}% — flights are running later than the long-run norm.`,
      link: '#/trend',
    });
  }

  // 2. Worst route.
  const worst = worstRoutes(routes, 1)[0];
  if (worst) {
    out.push({
      severity: 'alert',
      title: `${worst.route.replace('-', ' → ')} is the least punctual busy route`,
      detail: `Only ${(worst.recent12.otpArr ?? 0).toFixed(1)}% of flights arrived on time over the past year, with a ${(worst.recent12.cancelRate ?? 0).toFixed(1)}% cancellation rate across ${worst.recent12.flown.toLocaleString('en-AU')} flights.`,
      link: `#/routes?route=${encodeURIComponent(worst.route)}`,
    });
  }

  // 3. Best route.
  const best = bestRoutes(routes, 1)[0];
  if (best) {
    out.push({
      severity: 'good',
      title: `${best.route.replace('-', ' → ')} is the most reliable busy route`,
      detail: `${(best.recent12.otpArr ?? 0).toFixed(1)}% of flights arrived on time over the past year — the best of any route with steady traffic.`,
      link: `#/routes?route=${encodeURIComponent(best.route)}`,
    });
  }

  // 4. Highest cancellation route.
  const canc = mostCancelledRoutes(routes, 1)[0];
  if (canc && (canc.recent12.cancelRate ?? 0) >= 3) {
    out.push({
      severity: 'warn',
      title: `${canc.route.replace('-', ' → ')} has the highest cancellation rate`,
      detail: `${(canc.recent12.cancelRate ?? 0).toFixed(1)}% of scheduled flights were cancelled in the last year — well above the ${(summary.recent12National.cancelRate ?? 0).toFixed(1)}% industry rate.`,
      link: `#/routes?route=${encodeURIComponent(canc.route)}`,
    });
  }

  // 5. Most improved / most worsened airline.
  const trends = airlines
    .filter((a) => a.active)
    .map((a) => ({ a, t: airlineTrend(a) }))
    .filter((x): x is { a: Airline; t: { recent: number; prior: number; delta: number } } => x.t !== null);
  const improved = [...trends].sort((x, y) => y.t.delta - x.t.delta)[0];
  const worsened = [...trends].sort((x, y) => x.t.delta - y.t.delta)[0];
  if (improved && improved.t.delta > 1.5) {
    out.push({
      severity: 'good',
      title: `${improved.a.name} has improved the most`,
      detail: `Its on-time rate rose ${improved.t.delta.toFixed(1)} points year-on-year, from ${improved.t.prior.toFixed(1)}% to ${improved.t.recent.toFixed(1)}%.`,
      link: '#/airlines',
    });
  }
  if (worsened && worsened.t.delta < -1.5) {
    out.push({
      severity: 'warn',
      title: `${worsened.a.name} has slipped the most`,
      detail: `Its on-time rate fell ${Math.abs(worsened.t.delta).toFixed(1)} points year-on-year, from ${worsened.t.prior.toFixed(1)}% to ${worsened.t.recent.toFixed(1)}%.`,
      link: '#/airlines',
    });
  }

  // 6. Best and worst current airline.
  const ranked = airlines
    .filter((a) => a.active && a.recent12 && a.recent12.otpArr !== null && a.recent12.flown >= 5000)
    .sort((x, y) => (y.recent12!.otpArr ?? 0) - (x.recent12!.otpArr ?? 0));
  if (ranked.length >= 2) {
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    out.push({
      severity: 'info',
      title: `${top.name} leads the major airlines on punctuality`,
      detail: `${(top.recent12!.otpArr ?? 0).toFixed(1)}% on-time over the last year, versus ${(bottom.recent12!.otpArr ?? 0).toFixed(1)}% for ${bottom.name} at the back of the pack.`,
      link: '#/airlines',
    });
  }

  // 7. Worst cancellation month on record (the COVID story).
  const wc = worstCancelMonth(national.series);
  if (wc) {
    out.push({
      severity: 'info',
      title: `The worst month on record was ${wc.month}/${wc.year}`,
      detail: `${(wc.cancelRate ?? 0).toFixed(1)}% of all scheduled flights were cancelled that month — the peak of the COVID-19 travel disruption.`,
      link: '#/trend',
    });
  }

  return out;
}
