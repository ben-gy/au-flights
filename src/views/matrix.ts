import type { AppData } from '../types.ts';
import { formatNumber, formatPct, otpHeatColor, esc } from '../format.ts';
import { airportCode } from '../data/airports.ts';
import { term } from '../glossary-ui.ts';

interface Cell {
  flown: number;
  otpW: number;
}

export function render(data: AppData): string {
  // airline × departure-airport on-time arrival, aggregated from per-route airline figures
  const airlines = data.airlines
    .filter((a) => a.active && a.recent12 && a.recent12.flown >= 5000)
    .sort((a, b) => (b.recent12!.flown ?? 0) - (a.recent12!.flown ?? 0));
  const airlineNames = airlines.map((a) => a.name);

  const airportTotals = new Map<string, number>();
  const grid = new Map<string, Map<string, Cell>>(); // airport -> airline -> cell
  for (const r of data.routes) {
    if (!grid.has(r.dep)) grid.set(r.dep, new Map());
    const row = grid.get(r.dep)!;
    for (const al of r.airlines) {
      if (!airlineNames.includes(al.name)) continue;
      const c = row.get(al.name) ?? { flown: 0, otpW: 0 };
      c.flown += al.flown;
      c.otpW += (al.otpArr ?? 0) * al.flown;
      row.set(al.name, c);
      airportTotals.set(r.dep, (airportTotals.get(r.dep) ?? 0) + al.flown);
    }
  }

  const airports = [...airportTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([name]) => name);

  const head = `<tr><th class="matrix-corner">Airport \\ Airline</th>${airlines
    .map((a) => `<th class="matrix-colhead"><span class="airline-dot" style="background:${a.color}"></span>${esc(a.name)}</th>`)
    .join('')}</tr>`;

  const rows = airports
    .map((ap) => {
      const cells = airlines
        .map((a) => {
          const c = grid.get(ap)?.get(a.name);
          if (!c || c.flown < 200) return `<td class="matrix-cell empty" data-tip="${esc(ap)} · ${esc(a.name)}: too few flights"></td>`;
          const otp = c.otpW / c.flown;
          return `<td class="matrix-cell" style="background:${otpHeatColor(otp)}" data-tip="${esc(a.name)} out of ${esc(ap)}: ${formatPct(otp)} on time · ${formatNumber(c.flown)} flights/yr">${Math.round(otp)}</td>`;
        })
        .join('');
      return `<tr><th class="matrix-rowhead">${esc(ap)} <span class="muted">${esc(airportCode(ap))}</span></th>${cells}</tr>`;
    })
    .join('');

  return `
    <section class="view">
      <div class="section-head">
        <h1>Which airline is on time, out of which airport?</h1>
        <p class="section-sub">
          ${term('On-time arrival', 'on-time arrival')} rate for each airline departing each major airport over
          the last 12 months. Greener cells are more punctual; blank cells mean too few flights to report.
        </p>
      </div>
      <div class="table-wrap matrix-wrap">
        <table class="matrix-table">
          <thead>${head}</thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="legend heat-legend">
        <span class="legend-item"><span class="legend-dot" style="background:${otpHeatColor(60)}"></span>~60% on time</span>
        <span class="legend-item"><span class="legend-dot" style="background:${otpHeatColor(75)}"></span>~75%</span>
        <span class="legend-item"><span class="legend-dot" style="background:${otpHeatColor(88)}"></span>~88%+</span>
      </div>
      <p class="chart-note">Read across a row to compare airlines at one airport, or down a column to see where an airline runs best. Cells show the on-time percentage.</p>
    </section>`;
}
