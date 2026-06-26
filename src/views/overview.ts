import type { AppData } from '../types.ts';
import { formatNumber, formatPct, otpColor, cancelColor, esc } from '../format.ts';
import { hBarChart, lineChart, type LinePoint } from '../charts.ts';
import { statCards, sectionTitle, perfLegend } from './shared.ts';
import { term } from '../glossary-ui.ts';
import { bestRoutes, worstRoutes } from '../analysis.ts';

export function render(data: AppData): string {
  const s = data.summary;
  const rec = s.recent12National;
  const all = s.allTimeNational;
  const otpDelta = rec.otpArr !== null && all.otpArr !== null ? rec.otpArr - all.otpArr : 0;

  const cards = statCards([
    {
      label: 'On-time arrivals (last 12 months)',
      value: formatPct(rec.otpArr),
      color: otpColor(rec.otpArr),
      sub: `${otpDelta >= 0 ? '+' : ''}${otpDelta.toFixed(1)} pts vs 22-yr average`,
      tip: 'Share of flights that arrived within 15 minutes of schedule, across all reporting airlines over the last 12 months.',
    },
    {
      label: 'Cancellation rate (last 12 months)',
      value: formatPct(rec.cancelRate),
      color: cancelColor(rec.cancelRate),
      sub: `${formatNumber(rec.canc)} flights cancelled`,
      tip: 'Share of scheduled flights cancelled within 7 days of departure.',
    },
    {
      label: 'Flights tracked / year',
      value: formatNumber(rec.flown),
      sub: `${s.airlinesReporting} airlines reporting`,
    },
    {
      label: 'Routes & airports',
      value: `${s.routes} / ${s.airports}`,
      sub: `${s.firstLabel} – ${s.latestLabel}`,
    },
  ]);

  // mini national trend (annual averages of OTP)
  const byYear = new Map<number, { sum: number; n: number; canc: number }>();
  for (const p of data.national.series) {
    if (p.otpArr === null) continue;
    const e = byYear.get(p.year) ?? { sum: 0, n: 0, canc: 0 };
    e.sum += p.otpArr;
    e.canc += p.cancelRate ?? 0;
    e.n += 1;
    byYear.set(p.year, e);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const otpPts: LinePoint[] = years.map((y) => ({
    x: y,
    y: byYear.get(y)!.sum / byYear.get(y)!.n,
    label: String(y),
  }));
  const trendChart = lineChart([{ name: 'On-time %', color: '#0284c7', points: otpPts, fill: true }], {
    height: 240,
    yMin: 40,
    yMax: 95,
    yUnit: '%',
    yTicks: 5,
    xLabels: years.filter((y) => y % 3 === 0).map((y) => ({ x: y, label: String(y) })),
    markers: [{ x: 2020, label: 'COVID' }],
  });

  const best = bestRoutes(data.routes, 6);
  const worst = worstRoutes(data.routes, 6);
  const mkBars = (rs: typeof best) =>
    hBarChart(
      rs.map((r) => ({
        label: r.route.replace('-', ' → '),
        value: r.recent12.otpArr ?? 0,
        color: otpColor(r.recent12.otpArr),
        sub: `${formatNumber(r.recent12.flown)} flights`,
        tip: `${r.route.replace('-', ' → ')}: ${formatPct(r.recent12.otpArr)} on time, ${formatPct(r.recent12.cancelRate)} cancelled`,
        link: `#/routes?route=${encodeURIComponent(r.route)}`,
      })),
      { max: 100, unit: '%' },
    );

  return `
    <section class="view">
      <div class="hero">
        <h1>Which Australian flights actually run on time?</h1>
        <p class="hero-sub">
          ${term('On-time', 'on-time arrival')} performance, delays and ${term('cancellations', 'cancellation')}
          for every major domestic ${term('route', 'route')} and airline — straight from official
          ${term('BITRE', 'bitre')} data, ${esc(s.firstLabel)} to ${esc(s.latestLabel)}.
        </p>
      </div>

      ${cards}

      <div class="panel">
        ${sectionTitle('Industry on-time rate, year by year', 'Annual average share of flights arriving within 15 minutes of schedule. The 2020–21 dip is the COVID-19 shutdown.')}
        ${trendChart}
      </div>

      <div class="two-col">
        <div class="panel">
          ${sectionTitle('Most reliable busy routes', 'Highest on-time arrival rate over the last 12 months (routes with 300+ flights).')}
          ${perfLegend('otp')}
          ${mkBars(best)}
        </div>
        <div class="panel">
          ${sectionTitle('Least reliable busy routes', 'Lowest on-time arrival rate over the last 12 months.')}
          ${perfLegend('otp')}
          ${mkBars(worst)}
        </div>
      </div>

      <p class="cta-row">
        <a class="cta" href="#/routes">Search every route →</a>
        <a class="cta" href="#/airlines">Compare airlines →</a>
        <a class="cta" href="#/insights">See the insights →</a>
      </p>
    </section>`;
}
