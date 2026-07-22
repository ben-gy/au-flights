// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppData } from '../types.ts';
import { formatPct, monthShort, esc, otpHeatColor as heatColor } from '../format.ts';
import { hBarChart } from '../charts.ts';
import { sectionTitle, perfLegend } from './shared.ts';
import { term } from '../glossary-ui.ts';

export function render(data: AppData): string {
  // month-of-year averages (already computed, COVID excluded)
  const seasonal = data.national.seasonal;
  const monthBars = hBarChart(
    seasonal.map((s) => ({
      label: monthShort(s.month),
      value: s.otpArr ?? 0,
      color: heatColor(s.otpArr),
      sub: `${formatPct(s.cancelRate)} cancelled`,
      tip: `${monthShort(s.month)}: ${formatPct(s.otpArr)} on time on average, ${formatPct(s.cancelRate)} cancelled (2004–present, excl. 2020–21)`,
    })),
    { max: 100, unit: '%' },
  );

  // year × month heatmap
  const grid = new Map<number, Map<number, number | null>>();
  const years = new Set<number>();
  for (const p of data.national.series) {
    years.add(p.year);
    if (!grid.has(p.year)) grid.set(p.year, new Map());
    grid.get(p.year)!.set(p.month, p.otpArr);
  }
  const yearList = [...years].sort((a, b) => a - b);
  const header = `<div class="heat-row heat-head"><span class="heat-ylabel"></span>${Array.from({ length: 12 }, (_, i) => `<span class="heat-collabel">${monthShort(i + 1)}</span>`).join('')}</div>`;
  const rows = yearList
    .map((y) => {
      const cells = Array.from({ length: 12 }, (_, i) => {
        const v = grid.get(y)?.get(i + 1) ?? null;
        const tip = v === null ? `${monthShort(i + 1)} ${y}: no data` : `${monthShort(i + 1)} ${y}: ${formatPct(v)} on time`;
        return `<span class="heat-cell" style="background:${heatColor(v)}" data-tip="${esc(tip)}">${v === null ? '' : Math.round(v)}</span>`;
      }).join('');
      return `<div class="heat-row"><span class="heat-ylabel">${y}</span>${cells}</div>`;
    })
    .join('');

  return `
    <section class="view">
      <div class="section-head">
        <h1>When are delays worst?</h1>
        <p class="section-sub">
          How ${term('on-time', 'on-time arrival')} performance varies by month of the year and across the
          whole record. Summer storms and school-holiday peaks show up clearly.
        </p>
      </div>

      <div class="two-col">
        <div class="panel">
          ${sectionTitle('Average on-time rate by month of year', 'Averaged across 2004–present (2020–21 COVID years excluded). Higher is more punctual.')}
          ${perfLegend('otp')}
          ${monthBars}
        </div>
        <div class="panel">
          ${sectionTitle('How summer compares', 'The Australian summer (Dec–Feb) brings afternoon thunderstorms to the eastern seaboard, which is when most big routes are busiest and least punctual.')}
          <p class="prose">Each bar to the left is a calendar month averaged over 22 years. The grid below shows every individual month — read across a row to follow one year, or down a column to compare the same month across years.</p>
          <p class="prose">The deep red band across 2020–2021 is the COVID-19 period, when schedules collapsed and the few flights that ran were often disrupted.</p>
        </div>
      </div>

      <div class="panel">
        ${sectionTitle('On-time rate heatmap — every month, every year', 'Greener is more on time, redder is less. Numbers are the on-time arrival percentage.')}
        <div class="heatmap heatmap-seasonal">
          ${header}
          ${rows}
        </div>
        <div class="legend heat-legend">
          <span class="legend-item"><span class="legend-dot" style="background:${heatColor(60)}"></span>~60% on time</span>
          <span class="legend-item"><span class="legend-dot" style="background:${heatColor(75)}"></span>~75%</span>
          <span class="legend-item"><span class="legend-dot" style="background:${heatColor(88)}"></span>~88%+</span>
        </div>
      </div>
    </section>`;
}
