import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  formatPct,
  compact,
  ymLabel,
  monthName,
  monthShort,
  otpBand,
  cancelBand,
  otpColor,
  otpHeatColor,
  slugify,
  esc,
  debounce,
} from '../src/format.ts';

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
  it('handles negatives', () => {
    expect(formatNumber(-4210)).toBe('-4,210');
  });
  it('renders an em dash for null', () => {
    expect(formatNumber(null)).toBe('—');
  });
  it('renders an em dash for NaN', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
  });
});

describe('formatPct', () => {
  it('formats with one decimal and a percent sign', () => {
    expect(formatPct(82.14)).toBe('82.1%');
  });
  it('respects decimals argument', () => {
    expect(formatPct(50, 0)).toBe('50%');
  });
  it('dashes out null', () => {
    expect(formatPct(null)).toBe('—');
  });
});

describe('compact', () => {
  it('compacts millions', () => {
    expect(compact(2_729_037)).toBe('2.7M');
  });
  it('compacts thousands', () => {
    expect(compact(43_308)).toBe('43K');
  });
  it('leaves small numbers alone', () => {
    expect(compact(644)).toBe('644');
  });
});

describe('ymLabel', () => {
  it('converts an ISO year-month to a label', () => {
    expect(ymLabel('2026-05')).toBe('May 2026');
  });
  it('passes through unknown input', () => {
    expect(ymLabel('garbage')).toBe('garbage');
  });
});

describe('month names', () => {
  it('gives full month name', () => {
    expect(monthName(1)).toBe('January');
    expect(monthName(12)).toBe('December');
  });
  it('gives short month name', () => {
    expect(monthShort(6)).toBe('Jun');
  });
});

describe('performance bands', () => {
  it('classifies on-time rates', () => {
    expect(otpBand(85)).toBe('good');
    expect(otpBand(75)).toBe('ok');
    expect(otpBand(60)).toBe('poor');
    expect(otpBand(null)).toBe('ok');
  });
  it('classifies cancellation rates (lower is better)', () => {
    expect(cancelBand(1)).toBe('good');
    expect(cancelBand(3)).toBe('ok');
    expect(cancelBand(6)).toBe('poor');
  });
  it('maps a band to a colour', () => {
    expect(otpColor(90)).toBe('#16a34a');
    expect(otpColor(50)).toBe('#dc2626');
  });
});

describe('otpHeatColor', () => {
  it('returns grey for null', () => {
    expect(otpHeatColor(null)).toBe('#e5e7eb');
  });
  it('returns an rgb string for a value', () => {
    expect(otpHeatColor(75)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
  it('is greener at the top of the scale', () => {
    const high = otpHeatColor(90);
    const low = otpHeatColor(55);
    expect(high).not.toBe(low);
  });
});

describe('slugify & esc', () => {
  it('slugifies names', () => {
    expect(slugify('Virgin Australia')).toBe('virgin-australia');
    expect(slugify('Port Hedland-Perth')).toBe('port-hedland-perth');
  });
  it('escapes HTML-significant characters', () => {
    expect(esc('a & b <c> "d"')).toBe('a &amp; b &lt;c&gt; &quot;d&quot;');
  });
});

describe('debounce', () => {
  it('invokes only once after the delay', async () => {
    let calls = 0;
    const fn = debounce(() => {
      calls++;
    }, 20);
    fn();
    fn();
    fn();
    expect(calls).toBe(0);
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toBe(1);
  });
});
