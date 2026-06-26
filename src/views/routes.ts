import type { AppData, Route } from '../types.ts';
import { formatNumber, formatPct, otpColor, cancelColor, esc, ymLabel } from '../format.ts';
import { lineChart, hBarChart, type LinePoint } from '../charts.ts';
import { otpPill, cancelPill } from './shared.ts';
import { term } from '../glossary-ui.ts';
import { airportCode } from '../data/airports.ts';

type SortKey = 'traffic' | 'otp' | 'cancel' | 'name';

const ymIdx = (ym: string): number => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

function sortRoutes(routes: Route[], key: SortKey): Route[] {
  const r = [...routes];
  switch (key) {
    case 'otp':
      return r.sort((a, b) => (a.recent12.otpArr ?? 0) - (b.recent12.otpArr ?? 0));
    case 'cancel':
      return r.sort((a, b) => (b.recent12.cancelRate ?? 0) - (a.recent12.cancelRate ?? 0));
    case 'name':
      return r.sort((a, b) => a.route.localeCompare(b.route));
    default:
      return r.sort((a, b) => b.recent12.flown - a.recent12.flown);
  }
}

function airlineDots(r: Route): string {
  return r.airlines
    .slice(0, 5)
    .map((a) => `<span class="mini-dot" style="background:${a.color}" data-tip="${esc(a.name)}: ${formatPct(a.otpArr)} on time"></span>`)
    .join('');
}

export function render(data: AppData, params: URLSearchParams): string {
  const sort = (params.get('sort') as SortKey) || 'traffic';
  const selected = params.get('route');
  const sorted = sortRoutes(data.routes, sort);

  const rows = sorted
    .map((r) => {
      const sel = r.route === selected ? ' selected' : '';
      return `<tr class="route-row${sel}" data-route="${esc(r.route)}" data-search="${esc(r.route.toLowerCase())} ${esc(r.dep.toLowerCase())} ${esc(r.arr.toLowerCase())}">
        <td class="route-cell">
          <span class="route-name">${esc(r.dep)} <span class="arrow">→</span> ${esc(r.arr)}</span>
          <span class="route-codes">${esc(airportCode(r.dep))}–${esc(airportCode(r.arr))}</span>
        </td>
        <td class="dots-cell">${airlineDots(r)}</td>
        <td class="num">${formatNumber(r.recent12.flown)}</td>
        <td class="num"><span class="cell-pill" style="--pill:${otpColor(r.recent12.otpArr)}">${formatPct(r.recent12.otpArr)}</span></td>
        <td class="num"><span class="cell-pill" style="--pill:${cancelColor(r.recent12.cancelRate)}">${formatPct(r.recent12.cancelRate)}</span></td>
      </tr>`;
    })
    .join('');

  const sortBtn = (key: SortKey, label: string) =>
    `<a class="chip${sort === key ? ' active' : ''}" href="#/routes?sort=${key}${selected ? `&route=${encodeURIComponent(selected)}` : ''}">${esc(label)}</a>`;

  return `
    <section class="view">
      <div class="section-head">
        <h1>Every competitive route</h1>
        <p class="section-sub">
          On-time and ${term('cancellation', 'cancellation rate')} rates over the last 12 months for all
          ${data.routes.length} ${term('competitive routes', 'competitive route')}. Click a route for its full breakdown.
        </p>
      </div>

      <div class="route-controls">
        <input id="route-filter" type="search" placeholder="Filter routes (e.g. Sydney, Perth)…" aria-label="Filter routes" />
        <div class="sort-chips">
          <span class="sort-label">Sort:</span>
          ${sortBtn('traffic', 'Busiest')}
          ${sortBtn('otp', 'Worst on-time')}
          ${sortBtn('cancel', 'Most cancelled')}
          ${sortBtn('name', 'A–Z')}
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Airlines</th>
              <th class="num">Flights/yr</th>
              <th class="num">On&nbsp;time</th>
              <th class="num">Cancelled</th>
            </tr>
          </thead>
          <tbody id="route-tbody">${rows}</tbody>
        </table>
        <div id="route-empty" class="table-empty" hidden>No routes match your filter.</div>
      </div>

      <div id="route-detail-backdrop" class="detail-backdrop"${selected ? '' : ' hidden'}></div>
      <aside id="route-detail" class="route-detail-panel${selected ? ' open' : ''}" aria-live="polite">
        ${selected ? detailHtml(data, selected) : ''}
      </aside>
    </section>`;
}

function detailHtml(data: AppData, routeName: string): string {
  const r = data.routes.find((x) => x.route === routeName);
  if (!r) return `<div class="detail-inner"><p>Route not found.</p></div>`;
  const ind = data.summary.recent12National;
  const otpDelta = (r.recent12.otpArr ?? 0) - (ind.otpArr ?? 0);

  const pts = r.series.filter((p) => p.otpArr !== null).map<LinePoint>((p) => ({ x: ymIdx(p.ym), y: p.otpArr, label: ymLabel(p.ym) }));
  const xs = pts.map((p) => p.x);
  const xLabels: { x: number; label: string }[] = [];
  if (xs.length) {
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    for (let yr = Math.ceil(xMin / 12); yr * 12 <= xMax; yr++) if (yr % 1 === 0 && (yr % 2 === 0)) xLabels.push({ x: yr * 12, label: String(yr) });
  }
  const trend = pts.length > 1
    ? lineChart([{ name: 'On-time %', color: otpColor(r.recent12.otpArr), points: pts, fill: true }], {
        height: 200,
        yMin: 30,
        yMax: 100,
        yUnit: '%',
        yTicks: 4,
        xLabels,
      })
    : '<p class="chart-note">Not enough history to chart.</p>';

  const airlineBars = hBarChart(
    r.airlines.map((a) => ({
      label: a.name,
      value: a.otpArr ?? 0,
      color: a.color,
      sub: `${formatNumber(a.flown)} flights`,
      tip: `${a.name}: ${formatPct(a.otpArr)} on time, ${formatPct(a.cancelRate)} cancelled`,
    })),
    { max: 100, unit: '%' },
  );

  return `
    <div class="detail-inner">
      <button class="detail-close" aria-label="Close">×</button>
      <h2>${esc(r.dep)} <span class="arrow">→</span> ${esc(r.arr)}</h2>
      <p class="detail-codes">${esc(airportCode(r.dep))} – ${esc(airportCode(r.arr))} · ${formatNumber(r.recent12.flown)} flights in the last year</p>

      <div class="detail-stats">
        <div><span class="metric-label">On time</span>${otpPill(r.recent12.otpArr)}</div>
        <div><span class="metric-label">Cancelled</span>${cancelPill(r.recent12.cancelRate)}</div>
        <div><span class="metric-label">vs industry</span><span class="pill" style="--pill:${otpDelta >= 0 ? '#16a34a' : '#dc2626'}">${otpDelta >= 0 ? '+' : ''}${otpDelta.toFixed(1)} pts</span></div>
      </div>

      <div class="detail-section">
        <h3>By airline</h3>
        ${airlineBars}
      </div>

      <div class="detail-section">
        <h3>On-time rate over time</h3>
        ${trend}
      </div>

      <p class="detail-tip">Tip: the reverse direction (${esc(r.arr)} → ${esc(r.dep)}) is tracked separately — <a href="#/routes?route=${encodeURIComponent(`${r.arr}-${r.dep}`)}">compare it →</a></p>
    </div>`;
}

export function mount(root: HTMLElement, _data: AppData, params: URLSearchParams): void {
  const sort = params.get('sort') || 'traffic';

  // client-side filter (no navigation, keeps focus)
  const filter = root.querySelector('#route-filter') as HTMLInputElement;
  const tbody = root.querySelector('#route-tbody') as HTMLElement;
  const empty = root.querySelector('#route-empty') as HTMLElement;
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let visible = 0;
    tbody.querySelectorAll<HTMLElement>('.route-row').forEach((row) => {
      const match = !q || (row.dataset.search ?? '').includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    empty.hidden = visible > 0;
  });

  // row click → set route param (deep-linkable, opens panel)
  tbody?.querySelectorAll<HTMLElement>('.route-row').forEach((row) => {
    row.addEventListener('click', () => {
      location.hash = `#/routes?sort=${sort}&route=${encodeURIComponent(row.dataset.route!)}`;
    });
  });

  // detail close + backdrop
  const closePanel = () => {
    location.hash = `#/routes?sort=${sort}`;
  };
  root.querySelector('#route-detail .detail-close')?.addEventListener('click', closePanel);
  root.querySelector('#route-detail-backdrop')?.addEventListener('click', closePanel);

  // scroll selected row into view
  const sel = root.querySelector('.route-row.selected');
  sel?.scrollIntoView({ block: 'center' });
}
