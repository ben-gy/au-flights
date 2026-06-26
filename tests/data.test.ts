import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Airline, Route, Airport, Summary, NationalPoint } from '../src/types.ts';

const dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(dir, '..', 'public', 'data');
const read = <T>(name: string): T => JSON.parse(readFileSync(join(dataDir, name), 'utf8')) as T;

const summary = read<Summary>('summary.json');
const airlines = read<Airline[]>('airlines.json');
const routes = read<Route[]>('routes.json');
const airports = read<Airport[]>('airports.json');
const national = read<{ series: NationalPoint[]; seasonal: unknown[] }>('national.json');

describe('summary.json', () => {
  it('has a sane date range', () => {
    expect(summary.firstYm).toMatch(/^\d{4}-\d{2}$/);
    expect(summary.latestYm).toMatch(/^\d{4}-\d{2}$/);
    expect(summary.months).toBeGreaterThan(200);
  });
  it('reports at least a few reporting airlines', () => {
    expect(summary.airlinesReporting).toBeGreaterThanOrEqual(3);
  });
  it('national on-time rate is a plausible percentage', () => {
    const otp = summary.recent12National.otpArr ?? 0;
    expect(otp).toBeGreaterThan(50);
    expect(otp).toBeLessThanOrEqual(100);
  });
});

describe('airlines.json', () => {
  it('has airlines with colours and slugs', () => {
    expect(airlines.length).toBeGreaterThan(5);
    for (const a of airlines) {
      expect(a.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(a.slug.length).toBeGreaterThan(0);
    }
  });
  it('slugs are unique', () => {
    const slugs = new Set(airlines.map((a) => a.slug));
    expect(slugs.size).toBe(airlines.length);
  });
  it('active airlines have a recent12 block', () => {
    for (const a of airlines.filter((x) => x.active)) {
      expect(a.recent12).not.toBeNull();
    }
  });
});

describe('routes.json', () => {
  it('has directional routes with matching dep/arr', () => {
    expect(routes.length).toBeGreaterThan(50);
    for (const r of routes) {
      expect(r.route).toBe(`${r.dep}-${r.arr}`);
    }
  });
  it('on-time and cancellation rates are within range', () => {
    for (const r of routes) {
      if (r.recent12.otpArr !== null) {
        expect(r.recent12.otpArr).toBeGreaterThanOrEqual(0);
        expect(r.recent12.otpArr).toBeLessThanOrEqual(100);
      }
      if (r.recent12.cancelRate !== null) {
        expect(r.recent12.cancelRate).toBeGreaterThanOrEqual(0);
        expect(r.recent12.cancelRate).toBeLessThanOrEqual(100);
      }
    }
  });
  it('the busiest route is Melbourne–Sydney or Sydney–Melbourne', () => {
    const top = [...routes].sort((a, b) => b.recent12.flown - a.recent12.flown)[0];
    expect(['Melbourne-Sydney', 'Sydney-Melbourne']).toContain(top.route);
  });
});

describe('airports.json', () => {
  it('includes the major capitals', () => {
    const names = new Set(airports.map((a) => a.name));
    for (const cap of ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']) {
      expect(names.has(cap)).toBe(true);
    }
  });
  it('each airport lists destinations', () => {
    for (const a of airports) {
      expect(a.routes).toBeGreaterThan(0);
      expect(a.destinations.length).toBe(a.routes);
    }
  });
});

describe('national.json', () => {
  it('is chronologically ordered', () => {
    for (let i = 1; i < national.series.length; i++) {
      expect(national.series[i].ym >= national.series[i - 1].ym).toBe(true);
    }
  });
  it('has 12 seasonal buckets', () => {
    expect(national.seasonal.length).toBe(12);
  });
});
