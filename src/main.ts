import './style.css';
import type { AppData } from './types.ts';
import { initTooltip } from './tooltip.ts';
import { initGlossary } from './glossary-ui.ts';
import { openAbout } from './about.ts';
import { debounce, esc } from './format.ts';
import { airportCode } from './data/airports.ts';

import * as overview from './views/overview.ts';
import * as airlines from './views/airlines.ts';
import * as routes from './views/routes.ts';
import * as trend from './views/trend.ts';
import * as seasonality from './views/seasonality.ts';
import * as mapView from './views/map.ts';
import * as network from './views/network.ts';
import * as matrix from './views/matrix.ts';
import * as insights from './views/insights.ts';

export interface View {
  render(data: AppData, params: URLSearchParams): string;
  mount?(root: HTMLElement, data: AppData, params: URLSearchParams): void;
}

const VIEWS: { id: string; label: string; mod: View }[] = [
  { id: 'overview', label: 'Overview', mod: overview },
  { id: 'airlines', label: 'Airlines', mod: airlines },
  { id: 'routes', label: 'Routes', mod: routes },
  { id: 'trend', label: 'Trend', mod: trend },
  { id: 'seasonality', label: 'Seasonality', mod: seasonality },
  { id: 'map', label: 'Map', mod: mapView },
  { id: 'network', label: 'Network', mod: network },
  { id: 'matrix', label: 'Matrix', mod: matrix },
  { id: 'insights', label: 'Insights', mod: insights },
];

let DATA: AppData;

async function loadData(): Promise<AppData> {
  const base = import.meta.env.BASE_URL;
  const files = ['summary', 'airlines', 'routes', 'airports', 'national'];
  const [summary, airlinesD, routesD, airportsD, national] = await Promise.all(
    files.map(async (f) => {
      const res = await fetch(`${base}data/${f}.json`);
      if (!res.ok) throw new Error(`Failed to load ${f}.json (HTTP ${res.status})`);
      return res.json();
    }),
  );
  return {
    summary,
    airlines: airlinesD,
    routes: routesD,
    airports: airportsD,
    national,
  };
}

function parseHash(): { view: string; params: URLSearchParams } {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const view = VIEWS.some((v) => v.id === path) ? path : 'overview';
  return { view, params: new URLSearchParams(query ?? '') };
}

function renderHeader(): string {
  return `
    <header class="site-header">
      <a class="brand" href="#/overview" aria-label="Flight Delays Australia home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="currentColor"/></svg>
        </span>
        <span class="brand-text">Flight&nbsp;Delays <span class="brand-cc">(AU)</span></span>
      </a>
      <div class="header-search">
        <input id="global-search" type="search" placeholder="Search a route, airport or airline…" autocomplete="off" aria-label="Search" />
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <button id="about-btn" class="ghost-btn" aria-label="About this site">
        <span class="qmark">?</span><span class="about-label">About</span>
      </button>
    </header>`;
}

function renderTabs(active: string): string {
  return `<nav class="tab-bar" role="tablist">${VIEWS.map(
    (v) =>
      `<a class="tab${v.id === active ? ' active' : ''}" role="tab" aria-selected="${v.id === active}" href="#/${v.id}">${esc(v.label)}</a>`,
  ).join('')}</nav>`;
}

function renderFooter(): string {
  const updated = DATA.summary.generated;
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <p>
          Source: <a href="https://data.gov.au/data/dataset/domestic-airline-on-time-performance" target="_blank" rel="noopener">BITRE Domestic Airline On Time Performance</a>
          · Latest data ${esc(DATA.summary.latestLabel)} · Updated ${esc(updated)}
        </p>
        <p>Built by <a href="https://benrichardson.dev/" target="_blank" rel="noopener">benrichardson.dev</a> · <a href="https://sites.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a> · An independent tool, not affiliated with BITRE or any airline.</p>
      </div>
    </footer>`;
}

function renderRoute(): void {
  const { view, params } = parseHash();
  const def = VIEWS.find((v) => v.id === view)!;
  document.querySelectorAll('.tab').forEach((t) => {
    const isActive = (t as HTMLAnchorElement).getAttribute('href') === `#/${view}`;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });
  const main = document.getElementById('view-root')!;
  main.innerHTML = def.mod.render(DATA, params);
  main.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'auto' });
  def.mod.mount?.(main, DATA, params);
}

function setupSearch(): void {
  const input = document.getElementById('global-search') as HTMLInputElement;
  const results = document.getElementById('search-results') as HTMLDivElement;
  const items: { label: string; sub: string; href: string }[] = [];
  for (const a of DATA.airlines.filter((x) => x.active))
    items.push({ label: a.name, sub: 'Airline', href: `#/airlines` });
  for (const ap of DATA.airports)
    items.push({ label: `${ap.name} (${airportCode(ap.name)})`, sub: 'Airport', href: `#/map?airport=${encodeURIComponent(ap.name)}` });
  for (const r of DATA.routes)
    items.push({
      label: r.route.replace('-', ' → '),
      sub: 'Route',
      href: `#/routes?route=${encodeURIComponent(r.route)}`,
    });

  const run = debounce((q: string) => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) {
      results.hidden = true;
      return;
    }
    const matched = items
      .filter((i) => i.label.toLowerCase().includes(query))
      .slice(0, 8);
    if (!matched.length) {
      results.innerHTML = `<div class="search-empty">No matches for “${esc(q)}”</div>`;
      results.hidden = false;
      return;
    }
    results.innerHTML = matched
      .map(
        (m) =>
          `<a class="search-item" href="${esc(m.href)}"><span>${esc(m.label)}</span><span class="search-tag">${esc(m.sub)}</span></a>`,
      )
      .join('');
    results.hidden = false;
  }, 200);

  input.addEventListener('input', () => run(input.value));
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) run(input.value);
  });
  results.addEventListener('click', () => {
    results.hidden = true;
    input.value = '';
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.header-search')) results.hidden = true;
  });
}

function renderError(message: string): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="fatal-error" role="alert">
      <h1>Couldn’t load the flight data</h1>
      <p>${esc(message)}</p>
      <button onclick="location.reload()">Retry</button>
    </div>`;
}

async function boot(): Promise<void> {
  const app = document.getElementById('app')!;
  app.innerHTML = `<div class="boot-loading"><span class="spinner" aria-hidden="true"></span> Loading on-time performance data…</div>`;
  try {
    DATA = await loadData();
  } catch (err) {
    renderError(err instanceof Error ? err.message : String(err));
    return;
  }
  app.innerHTML = `
    ${renderHeader()}
    ${renderTabs(parseHash().view)}
    <main class="main-content"><div id="view-root"></div></main>
    ${renderFooter()}`;

  initTooltip();
  initGlossary();
  setupSearch();
  document.getElementById('about-btn')?.addEventListener('click', () => openAbout(DATA.summary));

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

boot();
