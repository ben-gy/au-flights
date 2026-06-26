import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { AppData } from '../types.ts';
import { formatNumber, formatPct, otpColor, esc } from '../format.ts';
import { AIRPORTS } from '../data/airports.ts';
import { perfLegend } from './shared.ts';
import { term } from '../glossary-ui.ts';

export function render(data: AppData): string {
  return `
    <section class="view view-map">
      <div class="section-head">
        <h1>The map of on-time flying</h1>
        <p class="section-sub">
          Every ${term('competitive route', 'competitive route')} drawn between its airports, coloured by
          ${term('on-time', 'on-time arrival')} rate. Bigger circles handle more flights. Click an airport for detail.
        </p>
      </div>
      ${perfLegend('otp')}
      <div class="map-shell">
        <div id="otp-map" class="map-canvas" role="application" aria-label="Map of Australian flight routes"></div>
      </div>
      <p class="chart-note">Lines show direction-averaged route reliability; circles show each airport's departure on-time rate. ${data.airports.length} airports, ${data.routes.length} routes.</p>
    </section>`;
}

export function mount(root: HTMLElement, data: AppData, params: URLSearchParams): void {
  const el = root.querySelector('#otp-map') as HTMLElement;
  if (!el) return;

  const map = L.map(el, { scrollWheelZoom: true, attributionControl: true }).setView([-25.5, 134], 4);
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap, © CARTO',
    subdomains: 'abcd',
    maxZoom: 11,
  }).addTo(map);

  // average both directions for each city pair so we draw one line per pair
  const pairKey = (a: string, b: string) => [a, b].sort().join('|');
  const pairs = new Map<string, { a: string; b: string; flown: number; otpW: number }>();
  for (const r of data.routes) {
    if (!AIRPORTS[r.dep] || !AIRPORTS[r.arr]) continue;
    const k = pairKey(r.dep, r.arr);
    const e = pairs.get(k) ?? { a: r.dep, b: r.arr, flown: 0, otpW: 0 };
    e.flown += r.recent12.flown;
    e.otpW += (r.recent12.otpArr ?? 0) * r.recent12.flown;
    pairs.set(k, e);
  }
  const maxFlown = Math.max(...[...pairs.values()].map((p) => p.flown));
  for (const p of pairs.values()) {
    const A = AIRPORTS[p.a];
    const B = AIRPORTS[p.b];
    const otp = p.flown ? p.otpW / p.flown : null;
    const weight = 1 + Math.sqrt(p.flown / maxFlown) * 5;
    L.polyline(
      [
        [A.lat, A.lon],
        [B.lat, B.lon],
      ],
      { color: otpColor(otp), weight, opacity: 0.55 },
    )
      .bindTooltip(`${A.name} ↔ ${B.name}: ${formatPct(otp)} on time · ${formatNumber(p.flown)} flights/yr`)
      .addTo(map);
  }

  const airportByName = new Map(data.airports.map((a) => [a.name, a]));
  const maxAir = Math.max(...data.airports.map((a) => a.flown));
  const selected = params.get('airport');
  let selectedMarker: L.CircleMarker | null = null;

  for (const info of Object.values(AIRPORTS)) {
    const stat = airportByName.get(info.name);
    if (!stat) continue;
    const radius = 4 + Math.sqrt(stat.flown / maxAir) * 16;
    const marker = L.circleMarker([info.lat, info.lon], {
      radius,
      fillColor: otpColor(stat.otpDep),
      color: '#1e293b',
      weight: 1,
      fillOpacity: 0.9,
    }).addTo(map);
    const dests = stat.destinations.slice(0, 12).join(', ') + (stat.destinations.length > 12 ? '…' : '');
    marker.bindPopup(
      `<div class="map-popup">
        <strong>${esc(info.name)} <span class="popup-code">${esc(info.code)}</span></strong>
        <div class="popup-row"><span>On-time departures</span><b style="color:${otpColor(stat.otpDep)}">${formatPct(stat.otpDep)}</b></div>
        <div class="popup-row"><span>Cancellation rate</span><b>${formatPct(stat.cancelRate)}</b></div>
        <div class="popup-row"><span>Flights / year</span><b>${formatNumber(stat.flown)}</b></div>
        <div class="popup-row"><span>Routes</span><b>${stat.routes}</b></div>
        <div class="popup-dests"><span>Flies to:</span> ${esc(dests)}</div>
      </div>`,
    );
    marker.bindTooltip(`${info.name} (${info.code}) · ${formatPct(stat.otpDep)} on time`);
    if (selected && info.name === selected) selectedMarker = marker;
  }

  if (selectedMarker) {
    map.setView(selectedMarker.getLatLng(), 6);
    selectedMarker.openPopup();
  }

  // Leaflet needs a size recalculation once laid out
  setTimeout(() => map.invalidateSize(), 50);
}
