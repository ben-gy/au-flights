import type { AppData, Airline } from '../types.ts';
import { formatNumber, esc, ymLabel } from '../format.ts';
import { lineChart, sparkline, type LinePoint } from '../charts.ts';
import { otpPill, cancelPill, sectionTitle, perfLegend } from './shared.ts';
import { term } from '../glossary-ui.ts';
import { airlineTrend } from '../analysis.ts';

const ymIdx = (ym: string): number => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

function airlineCard(a: Airline): string {
  const r = a.recent12!;
  const trend = airlineTrend(a);
  const arrow =
    trend && Math.abs(trend.delta) >= 0.3
      ? `<span class="trend-arrow ${trend.delta > 0 ? 'up' : 'down'}" data-tip="On-time rate ${trend.delta > 0 ? 'up' : 'down'} ${Math.abs(trend.delta).toFixed(1)} pts vs the prior 12 months">${trend.delta > 0 ? '▲' : '▼'} ${Math.abs(trend.delta).toFixed(1)}</span>`
      : '';
  return `
    <button class="airline-card" data-slug="${esc(a.slug)}" style="--c:${a.color}">
      <div class="airline-card-head">
        <span class="airline-dot" style="background:${a.color}"></span>
        <span class="airline-name">${esc(a.name)}</span>
        ${arrow}
      </div>
      <div class="airline-metrics">
        <div><span class="metric-label">On time</span>${otpPill(r.otpArr)}</div>
        <div><span class="metric-label">Cancelled</span>${cancelPill(r.cancelRate)}</div>
      </div>
      <div class="airline-spark">${sparkline(
        a.series.slice(-60).map((p) => p.otpArr),
        a.color,
        200,
        32,
      )}</div>
      <div class="airline-foot">${formatNumber(r.flown)} flights · last 12 months</div>
    </button>`;
}

export function render(data: AppData): string {
  const active = data.airlines
    .filter((a) => a.active && a.recent12 && a.recent12.otpArr !== null && a.recent12.flown >= 1000)
    .sort((a, b) => (b.recent12!.otpArr ?? 0) - (a.recent12!.otpArr ?? 0));

  // multi-series OTP over the last 10 years for the majors (flown >= 100k all-time)
  const majors = active.filter((a) => a.allTime.flown >= 100000);
  const cutoff = data.summary.latestYm ? ymIdx(data.summary.latestYm) - 120 : 0;
  const series = majors.map((a) => ({
    name: a.name,
    color: a.color,
    points: a.series
      .filter((p) => ymIdx(p.ym) >= cutoff && p.otpArr !== null)
      .map<LinePoint>((p) => ({ x: ymIdx(p.ym), y: p.otpArr, label: ymLabel(p.ym) })),
  }));
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xLabels: { x: number; label: string }[] = [];
  for (let yr = Math.ceil(xMin / 12); yr * 12 <= xMax; yr++) {
    if (yr % 2 === 0) xLabels.push({ x: yr * 12, label: String(yr) });
  }
  const multi = lineChart(series, {
    height: 300,
    yMin: 50,
    yMax: 95,
    yUnit: '%',
    yTicks: 5,
    xLabels,
  });

  const legend = `<div class="legend">${majors
    .map((a) => `<span class="legend-item"><span class="legend-dot" style="background:${a.color}"></span>${esc(a.name)}</span>`)
    .join('')}</div>`;

  return `
    <section class="view">
      <div class="section-head">
        <h1>Airline punctuality leaderboard</h1>
        <p class="section-sub">
          ${term('Reporting airlines', 'reporting airline')} ranked by ${term('on-time arrival', 'on-time arrival')}
          rate over the last 12 months. Tap an airline for its full 22-year history.
        </p>
      </div>
      ${perfLegend('otp')}
      <div class="airline-grid">${active.map(airlineCard).join('')}</div>

      <div id="airline-detail" class="panel airline-detail" hidden></div>

      <div class="panel">
        ${sectionTitle('On-time rate over the last 10 years', 'Each line is one major airline. Higher is more punctual.')}
        ${legend}
        ${multi}
      </div>
    </section>`;
}

function detailHtml(a: Airline): string {
  const r = a.recent12!;
  const t = airlineTrend(a);
  const pts = a.series.filter((p) => p.otpArr !== null).map<LinePoint>((p) => ({ x: ymIdx(p.ym), y: p.otpArr, label: ymLabel(p.ym) }));
  const cancPts = a.series.filter((p) => p.cancelRate !== null).map<LinePoint>((p) => ({ x: ymIdx(p.ym), y: p.cancelRate, label: ymLabel(p.ym) }));
  const xs = pts.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xLabels: { x: number; label: string }[] = [];
  for (let yr = Math.ceil(xMin / 12); yr * 12 <= xMax; yr++) if (yr % 3 === 0) xLabels.push({ x: yr * 12, label: String(yr) });

  return `
    <button class="detail-close" aria-label="Close">×</button>
    <div class="section-head"><h2><span class="airline-dot" style="background:${a.color}"></span> ${esc(a.name)}</h2>
      <p class="section-sub">${formatNumber(a.allTime.flown)} flights tracked since ${esc(ymLabel(a.firstYm))}.</p>
    </div>
    <div class="detail-stats">
      <div><span class="metric-label">On time (12 mo)</span>${otpPill(r.otpArr)}</div>
      <div><span class="metric-label">Cancelled (12 mo)</span>${cancelPill(r.cancelRate)}</div>
      <div><span class="metric-label">All-time on time</span>${otpPill(a.allTime.otpArr)}</div>
      ${t ? `<div><span class="metric-label">Year-on-year</span><span class="pill" style="--pill:${t.delta >= 0 ? '#16a34a' : '#dc2626'}">${t.delta >= 0 ? '+' : ''}${t.delta.toFixed(1)} pts</span></div>` : ''}
    </div>
    ${lineChart(
      [
        { name: 'On-time %', color: a.color, points: pts, fill: true },
        { name: 'Cancelled %', color: '#dc2626', points: cancPts.map((p) => ({ ...p, y: p.y === null ? null : p.y * 4 })) },
      ],
      { height: 260, yMin: 0, yMax: 100, yUnit: '%', yTicks: 5, xLabels },
    )}
    <p class="chart-note">Blue = on-time arrival rate. Red = cancellation rate (scaled ×4 for visibility).</p>`;
}

export function mount(root: HTMLElement, data: AppData): void {
  const detail = root.querySelector('#airline-detail') as HTMLElement;
  const open = (slug: string) => {
    const a = data.airlines.find((x) => x.slug === slug);
    if (!a || !a.recent12) return;
    detail.innerHTML = detailHtml(a);
    detail.hidden = false;
    detail.querySelector('.detail-close')?.addEventListener('click', () => {
      detail.hidden = true;
    });
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  root.querySelectorAll<HTMLElement>('.airline-card').forEach((card) => {
    card.addEventListener('click', () => open(card.dataset.slug!));
  });
}
