import type { AppData } from '../types.ts';
import { formatPct, esc, ymLabel } from '../format.ts';
import { lineChart, type LinePoint } from '../charts.ts';
import { statCards, sectionTitle } from './shared.ts';
import { term } from '../glossary-ui.ts';
import { worstCancelMonth } from '../analysis.ts';

const ymIdx = (ym: string): number => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

export function render(data: AppData): string {
  const series = data.national.series;
  const otpPts = series.filter((p) => p.otpArr !== null).map<LinePoint>((p) => ({ x: ymIdx(p.ym), y: p.otpArr, label: ymLabel(p.ym) }));
  const cancPts = series.filter((p) => p.cancelRate !== null).map<LinePoint>((p) => ({ x: ymIdx(p.ym), y: p.cancelRate, label: ymLabel(p.ym) }));

  const xs = otpPts.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xLabels: { x: number; label: string }[] = [];
  for (let yr = Math.ceil(xMin / 12); yr * 12 <= xMax; yr++) if (yr % 2 === 0) xLabels.push({ x: yr * 12, label: String(yr) });

  const markers = [
    { x: 2020 * 12 + 2, label: 'COVID' },
    { x: 2011 * 12 + 0, label: 'QLD floods' },
  ];

  const best = [...otpPts].sort((a, b) => (b.y ?? 0) - (a.y ?? 0))[0];
  const worstOtp = [...otpPts].sort((a, b) => (a.y ?? 0) - (b.y ?? 0))[0];
  const worstCanc = worstCancelMonth(series);

  const cards = statCards([
    { label: 'Best month ever', value: formatPct(best?.y ?? null), sub: best?.label, color: '#16a34a' },
    { label: 'Worst on-time month', value: formatPct(worstOtp?.y ?? null), sub: worstOtp?.label, color: '#dc2626' },
    { label: 'Worst cancellation month', value: formatPct(worstCanc?.cancelRate ?? null), sub: worstCanc ? ymLabel(worstCanc.ym) : '', color: '#dc2626' },
    { label: 'Months of data', value: String(series.length), sub: `${data.summary.firstLabel} – ${data.summary.latestLabel}` },
  ]);

  return `
    <section class="view">
      <div class="section-head">
        <h1>22 years of Australian flight punctuality</h1>
        <p class="section-sub">
          Monthly industry-wide ${term('on-time arrival', 'on-time arrival')} and
          ${term('cancellation rate', 'cancellation rate')} across all ${term('reporting airlines', 'reporting airline')}.
        </p>
      </div>
      ${cards}
      <div class="panel">
        ${sectionTitle('On-time arrival rate, every month', 'Share of flights arriving within 15 minutes of schedule. The sharp 2020 collapse is COVID-19.')}
        ${lineChart([{ name: 'On-time %', color: '#0284c7', points: otpPts, fill: true }], {
          height: 320,
          yMin: 30,
          yMax: 95,
          yUnit: '%',
          yTicks: 5,
          xLabels,
          markers,
        })}
      </div>
      <div class="panel">
        ${sectionTitle('Cancellation rate, every month', 'Share of scheduled flights cancelled. Spikes mark major disruptions — COVID, floods and storms.')}
        ${lineChart([{ name: 'Cancelled %', color: '#dc2626', points: cancPts, fill: true }], {
          height: 280,
          yMin: 0,
          yMax: Math.max(10, Math.ceil((Math.max(...cancPts.map((p) => p.y ?? 0)) + 2) / 5) * 5),
          yUnit: '%',
          yTicks: 5,
          xLabels,
          markers,
        })}
      </div>
      <p class="chart-note">Hover any point for the exact month and figure. ${esc(data.summary.latestLabel)} is the most recent month published.</p>
    </section>`;
}
