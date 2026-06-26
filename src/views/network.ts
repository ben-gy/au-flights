import type { AppData } from '../types.ts';
import { formatNumber, formatPct, otpColor, esc } from '../format.ts';
import { airportCode } from '../data/airports.ts';
import { perfLegend } from './shared.ts';
import { term } from '../glossary-ui.ts';

interface PairAirline {
  name: string;
  color: string;
  flown: number;
  otpW: number;
}
interface Pair {
  a: string;
  b: string;
  flown: number;
  otpW: number;
  airlines: Map<string, PairAirline>;
}
interface Node {
  name: string;
  flown: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function render(data: AppData): string {
  const airlineOpts = data.airlines
    .filter((a) => a.active && a.recent12 && a.recent12.flown >= 5000)
    .sort((a, b) => (b.recent12!.flown ?? 0) - (a.recent12!.flown ?? 0))
    .map((a) => `<option value="${esc(a.name)}">${esc(a.name)}</option>`)
    .join('');

  return `
    <section class="view">
      <div class="section-head">
        <h1>The route network</h1>
        <p class="section-sub">
          Airports linked by the routes between them. Circle size = flights handled; line colour =
          ${term('on-time', 'on-time arrival')} rate. Filter to one airline to see only where it flies.
        </p>
      </div>
      <div class="network-controls">
        <label>Airline:
          <select id="net-airline">
            <option value="">All airlines</option>
            ${airlineOpts}
          </select>
        </label>
        ${perfLegend('otp')}
      </div>
      <div class="network-shell">
        <svg id="net-svg" viewBox="0 0 1000 640" class="network-svg" role="img" aria-label="Route network graph"></svg>
      </div>
      <p class="chart-note">Hover a city to highlight its connections. Hand-rolled force layout — positions reveal hub structure, not geography.</p>
    </section>`;
}

function buildPairs(data: AppData): { pairs: Pair[]; nodes: Map<string, Node> } {
  const key = (a: string, b: string) => [a, b].sort().join('|');
  const pairs = new Map<string, Pair>();
  for (const r of data.routes) {
    const k = key(r.dep, r.arr);
    const e = pairs.get(k) ?? { a: [r.dep, r.arr].sort()[0], b: [r.dep, r.arr].sort()[1], flown: 0, otpW: 0, airlines: new Map() };
    e.flown += r.recent12.flown;
    e.otpW += (r.recent12.otpArr ?? 0) * r.recent12.flown;
    for (const al of r.airlines) {
      const pa = e.airlines.get(al.name) ?? { name: al.name, color: al.color, flown: 0, otpW: 0 };
      pa.flown += al.flown;
      pa.otpW += (al.otpArr ?? 0) * al.flown;
      e.airlines.set(al.name, pa);
    }
    pairs.set(k, e);
  }
  const nodes = new Map<string, Node>();
  const statByName = new Map(data.airports.map((a) => [a.name, a]));
  let i = 0;
  for (const p of pairs.values()) {
    for (const name of [p.a, p.b]) {
      if (!nodes.has(name)) {
        const angle = (i * 2.39996) % (Math.PI * 2);
        const rad = 120 + (i % 7) * 30;
        nodes.set(name, {
          name,
          flown: statByName.get(name)?.flown ?? 0,
          x: 500 + Math.cos(angle) * rad,
          y: 320 + Math.sin(angle) * rad,
          vx: 0,
          vy: 0,
        });
        i++;
      }
    }
  }
  return { pairs: [...pairs.values()], nodes };
}

function simulate(pairs: Pair[], nodes: Map<string, Node>): void {
  const list = [...nodes.values()];
  const k = 120;
  let temp = 200;
  for (let iter = 0; iter < 320; iter++) {
    // repulsion
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const na = list[a];
        const nb = list[b];
        let dx = na.x - nb.x;
        let dy = na.y - nb.y;
        let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const rep = (k * k) / d;
        dx /= d;
        dy /= d;
        na.vx += dx * rep;
        na.vy += dy * rep;
        nb.vx -= dx * rep;
        nb.vy -= dy * rep;
      }
    }
    // attraction along edges
    for (const p of pairs) {
      const na = nodes.get(p.a)!;
      const nb = nodes.get(p.b)!;
      let dx = na.x - nb.x;
      let dy = na.y - nb.y;
      let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const att = (d * d) / k;
      dx /= d;
      dy /= d;
      na.vx -= dx * att * 0.5;
      na.vy -= dy * att * 0.5;
      nb.vx += dx * att * 0.5;
      nb.vy += dy * att * 0.5;
    }
    // gravity to centre + integrate with cooling
    for (const n of list) {
      n.vx += (500 - n.x) * 0.012;
      n.vy += (320 - n.y) * 0.012;
      const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy) || 0.01;
      const move = Math.min(sp, temp);
      n.x += (n.vx / sp) * move;
      n.y += (n.vy / sp) * move;
      n.x = Math.max(40, Math.min(960, n.x));
      n.y = Math.max(40, Math.min(600, n.y));
      n.vx *= 0.85;
      n.vy *= 0.85;
    }
    temp *= 0.985;
  }
}

export function mount(root: HTMLElement, data: AppData): void {
  const svg = root.querySelector('#net-svg') as SVGSVGElement;
  const select = root.querySelector('#net-airline') as HTMLSelectElement;
  if (!svg) return;

  const { pairs, nodes } = buildPairs(data);
  simulate(pairs, nodes);
  const maxFlown = Math.max(...[...nodes.values()].map((n) => n.flown), 1);

  const edgeEls = new Map<Pair, SVGLineElement>();
  const nodeEls = new Map<string, { circle: SVGCircleElement; label: SVGTextElement }>();

  const edgeGroup = document.createElementNS(SVG_NS, 'g');
  const nodeGroup = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(edgeGroup);
  svg.appendChild(nodeGroup);

  for (const p of pairs) {
    const na = nodes.get(p.a)!;
    const nb = nodes.get(p.b)!;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', na.x.toFixed(1));
    line.setAttribute('y1', na.y.toFixed(1));
    line.setAttribute('x2', nb.x.toFixed(1));
    line.setAttribute('y2', nb.y.toFixed(1));
    line.setAttribute('class', 'net-edge');
    edgeGroup.appendChild(line);
    edgeEls.set(p, line);
  }

  for (const n of nodes.values()) {
    const r = 4 + Math.sqrt(n.flown / maxFlown) * 20;
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', n.x.toFixed(1));
    circle.setAttribute('cy', n.y.toFixed(1));
    circle.setAttribute('r', r.toFixed(1));
    circle.setAttribute('class', 'net-node');
    circle.setAttribute('data-name', n.name);
    nodeGroup.appendChild(circle);
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', n.x.toFixed(1));
    label.setAttribute('y', (n.y - r - 3).toFixed(1));
    label.setAttribute('class', 'net-label');
    label.textContent = airportCode(n.name);
    if (r < 9) label.style.display = 'none';
    nodeGroup.appendChild(label);
    nodeEls.set(n.name, { circle, label });
  }

  const statByName = new Map(data.airports.map((a) => [a.name, a]));

  function paint(airline: string): void {
    let maxEdgeFlown = 1;
    for (const p of pairs) {
      const f = airline ? p.airlines.get(airline)?.flown ?? 0 : p.flown;
      if (f > maxEdgeFlown) maxEdgeFlown = f;
    }
    for (const [p, line] of edgeEls) {
      const data2 = airline ? p.airlines.get(airline) : { flown: p.flown, otpW: p.otpW };
      if (!data2 || data2.flown <= 0) {
        line.style.display = 'none';
        continue;
      }
      line.style.display = '';
      const otp = data2.flown ? data2.otpW / data2.flown : null;
      line.style.stroke = otpColor(otp);
      line.style.strokeWidth = (0.6 + Math.sqrt(data2.flown / maxEdgeFlown) * 4).toFixed(2);
      line.setAttribute('data-tip', `${p.a} ↔ ${p.b}: ${formatPct(otp)} on time · ${formatNumber(data2.flown)} flights/yr`);
    }
    // dim nodes with no visible edge
    for (const [name, { circle }] of nodeEls) {
      const hasEdge = pairs.some(
        (p) => (p.a === name || p.b === name) && (airline ? (p.airlines.get(airline)?.flown ?? 0) > 0 : true),
      );
      circle.style.opacity = hasEdge ? '1' : '0.15';
      const stat = statByName.get(name);
      circle.setAttribute('data-tip', `${name} (${airportCode(name)}) — ${formatPct(stat?.otpDep ?? null)} on-time departures · ${formatNumber(stat?.flown ?? 0)} flights/yr`);
    }
  }

  // hover highlight
  nodeGroup.addEventListener('mouseover', (e) => {
    const c = (e.target as Element).closest('.net-node') as SVGCircleElement | null;
    if (!c) return;
    const name = c.getAttribute('data-name');
    svg.classList.add('net-focus');
    for (const [p, line] of edgeEls) {
      line.classList.toggle('hot', p.a === name || p.b === name);
    }
  });
  nodeGroup.addEventListener('mouseout', () => {
    svg.classList.remove('net-focus');
    for (const line of edgeEls.values()) line.classList.remove('hot');
  });

  select.addEventListener('change', () => paint(select.value));
  paint('');
}
