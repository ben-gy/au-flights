import { describe, expect, it } from 'vitest';
import {
  median,
  worstRoutes,
  bestRoutes,
  mostCancelledRoutes,
  airlineTrend,
  worstCancelMonth,
  buildInsights,
} from '../src/analysis.ts';
import type { AppData, Airline, Route, NationalPoint } from '../src/types.ts';

function route(name: string, otpArr: number, cancelRate: number, flown = 1000): Route {
  const [dep, arr] = name.split('-');
  return {
    route: name,
    dep,
    arr,
    recent12: {
      sched: flown,
      flown,
      canc: Math.round((cancelRate / 100) * flown),
      arrOnTime: Math.round((otpArr / 100) * flown),
      depOnTime: 0,
      arrDelayed: 0,
      otpArr,
      otpDep: otpArr,
      cancelRate,
    },
    airlines: [],
    series: [],
  };
}

function airline(name: string, recentOtp: number, priorOtp: number): Airline {
  const series = [];
  for (let i = 0; i < 12; i++) series.push({ ym: `2024-${String(i + 1).padStart(2, '0')}`, flown: 1000, canc: 10, otpArr: priorOtp, cancelRate: 1 });
  for (let i = 0; i < 12; i++) series.push({ ym: `2025-${String(i + 1).padStart(2, '0')}`, flown: 1000, canc: 10, otpArr: recentOtp, cancelRate: 1 });
  return {
    name,
    slug: name.toLowerCase(),
    color: '#000',
    active: true,
    firstYm: '2024-01',
    lastYm: '2025-12',
    allTime: { sched: 24000, flown: 24000, canc: 240, arrOnTime: 0, depOnTime: 0, arrDelayed: 0, otpArr: (recentOtp + priorOtp) / 2, otpDep: 0, cancelRate: 1 },
    recent12: { sched: 12000, flown: 12000, canc: 120, arrOnTime: 0, depOnTime: 0, arrDelayed: 0, otpArr: recentOtp, otpDep: recentOtp, cancelRate: 1 },
    series,
  };
}

describe('median', () => {
  it('handles odd length', () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it('averages the middle two for even length', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('ignores non-finite values', () => {
    expect(median([1, Number.NaN, 3])).toBe(2);
  });
});

describe('route rankings', () => {
  const routes = [
    route('A-B', 90, 1),
    route('C-D', 60, 5),
    route('E-F', 75, 3),
    route('G-H', 50, 8, 100), // below 300 flights — excluded
  ];
  it('worstRoutes returns lowest on-time first and excludes thin routes', () => {
    const w = worstRoutes(routes, 2);
    expect(w[0].route).toBe('C-D');
    expect(w.map((r) => r.route)).not.toContain('G-H');
  });
  it('bestRoutes returns highest on-time first', () => {
    expect(bestRoutes(routes, 1)[0].route).toBe('A-B');
  });
  it('mostCancelledRoutes returns highest cancellation first', () => {
    expect(mostCancelledRoutes(routes, 1)[0].route).toBe('C-D');
  });
});

describe('airlineTrend', () => {
  it('detects an improvement', () => {
    const t = airlineTrend(airline('Up', 80, 70));
    expect(t).not.toBeNull();
    expect(t!.delta).toBeCloseTo(10, 5);
  });
  it('detects a decline', () => {
    const t = airlineTrend(airline('Down', 65, 78));
    expect(t!.delta).toBeCloseTo(-13, 5);
  });
  it('returns null without enough history', () => {
    const a = airline('Short', 80, 70);
    a.series = a.series.slice(0, 10);
    expect(airlineTrend(a)).toBeNull();
  });
});

describe('worstCancelMonth', () => {
  it('finds the highest cancellation month', () => {
    const series: NationalPoint[] = [
      { ym: '2020-03', year: 2020, month: 3, sched: 100, flown: 50, canc: 50, arrOnTime: 0, depOnTime: 0, arrDelayed: 0, otpArr: 70, otpDep: 70, cancelRate: 50 },
      { ym: '2019-01', year: 2019, month: 1, sched: 100, flown: 98, canc: 2, arrOnTime: 0, depOnTime: 0, arrDelayed: 0, otpArr: 85, otpDep: 85, cancelRate: 2 },
    ];
    expect(worstCancelMonth(series)?.ym).toBe('2020-03');
  });
  it('returns null for empty input', () => {
    expect(worstCancelMonth([])).toBeNull();
  });
});

describe('buildInsights', () => {
  const data: AppData = {
    summary: {
      generated: '2026-06-26',
      latestYm: '2026-05',
      latestLabel: 'May 2026',
      firstYm: '2004-01',
      firstLabel: 'Jan 2004',
      months: 269,
      routes: 3,
      airports: 6,
      airlinesReporting: 2,
      latestNational: null,
      recent12National: { sched: 12000, flown: 11800, canc: 200, arrOnTime: 9000, depOnTime: 9100, arrDelayed: 2800, otpArr: 76, otpDep: 77, cancelRate: 2.3 },
      allTimeNational: { sched: 100000, flown: 98000, canc: 2000, arrOnTime: 79000, depOnTime: 80000, arrDelayed: 19000, otpArr: 80.5, otpDep: 81, cancelRate: 2.2 },
    },
    airlines: [airline('Qantas', 82, 79), airline('Jetstar', 70, 74)],
    routes: [route('Melbourne-Sydney', 60, 5, 24000), route('Hobart-Sydney', 88, 1, 5000), route('Perth-Adelaide', 75, 3, 8000)],
    airports: [],
    national: {
      series: [
        { ym: '2020-04', year: 2020, month: 4, sched: 100, flown: 30, canc: 70, arrOnTime: 0, depOnTime: 0, arrDelayed: 0, otpArr: 65, otpDep: 65, cancelRate: 70 },
      ],
      seasonal: [],
    },
  };
  it('produces multiple insights', () => {
    const ins = buildInsights(data);
    expect(ins.length).toBeGreaterThanOrEqual(5);
  });
  it('flags the worst route as an alert', () => {
    const ins = buildInsights(data);
    const alert = ins.find((i) => i.severity === 'alert');
    expect(alert?.title).toContain('Melbourne');
  });
  it('every insight has a title and detail', () => {
    for (const i of buildInsights(data)) {
      expect(i.title.length).toBeGreaterThan(0);
      expect(i.detail.length).toBeGreaterThan(0);
    }
  });
});
