// Hand-rolled SVG chart builders. Every chart returns an SVG markup string and
// uses data-tip attributes for hover tooltips (wired globally in tooltip.ts).
import { esc } from './format.ts';

export interface BarItem {
  label: string;
  value: number;
  color: string;
  /** Secondary text shown right-aligned (e.g. a count). */
  sub?: string;
  /** Tooltip text. */
  tip?: string;
  /** Optional hash to link to. */
  link?: string;
}

export interface BarOpts {
  max?: number;
  unit?: string;
  decimals?: number;
  width?: number;
}

/** Horizontal bar chart as a list of rows. */
export function hBarChart(items: BarItem[], opts: BarOpts = {}): string {
  const max = opts.max ?? Math.max(1, ...items.map((i) => i.value));
  const unit = opts.unit ?? '';
  const dec = opts.decimals ?? 1;
  const rows = items
    .map((i) => {
      const w = Math.max(0, Math.min(100, (i.value / max) * 100));
      const valTxt = `${i.value.toFixed(dec)}${unit}`;
      const tag = i.link ? 'a' : 'div';
      const href = i.link ? ` href="${esc(i.link)}"` : '';
      return `<${tag} class="bar-row"${href}${i.tip ? ` data-tip="${esc(i.tip)}"` : ''}>
        <span class="bar-label">${esc(i.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${w.toFixed(1)}%;background:${i.color}"></span></span>
        <span class="bar-value">${esc(valTxt)}</span>
        ${i.sub ? `<span class="bar-sub">${esc(i.sub)}</span>` : ''}
      </${tag}>`;
    })
    .join('');
  return `<div class="hbar-chart">${rows}</div>`;
}

export interface LinePoint {
  x: number; // index along the x axis
  y: number | null;
  label: string; // x tooltip label
}

export interface LineSeries {
  name: string;
  color: string;
  points: LinePoint[];
  fill?: boolean;
}

export interface LineOpts {
  width?: number;
  height?: number;
  yMin?: number;
  yMax?: number;
  yUnit?: string;
  yTicks?: number;
  xLabels?: { x: number; label: string }[];
  markers?: { x: number; label: string }[];
}

/** Multi-series line chart (SVG). */
export function lineChart(series: LineSeries[], opts: LineOpts = {}): string {
  const W = opts.width ?? 900;
  const H = opts.height ?? 320;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const allY = series.flatMap((s) => s.points.map((p) => p.y).filter((y): y is number => y !== null));
  const yMin = opts.yMin ?? Math.min(...allY);
  const yMax = opts.yMax ?? Math.max(...allY);
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const sy = (y: number) => padT + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH;

  // y gridlines + labels
  const yTicks = opts.yTicks ?? 4;
  let grid = '';
  for (let i = 0; i <= yTicks; i++) {
    const val = yMin + ((yMax - yMin) * i) / yTicks;
    const y = sy(val);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="grid-line" />`;
    grid += `<text x="${padL - 6}" y="${(y + 3).toFixed(1)}" class="axis-label y">${val.toFixed(0)}${opts.yUnit ?? ''}</text>`;
  }

  // markers (vertical reference lines)
  let markers = '';
  for (const m of opts.markers ?? []) {
    const x = sx(m.x);
    markers += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${padT + plotH}" class="marker-line" />`;
    markers += `<text x="${x.toFixed(1)}" y="${padT + 10}" class="marker-label">${esc(m.label)}</text>`;
  }

  // x labels
  let xlabels = '';
  for (const xl of opts.xLabels ?? []) {
    const x = sx(xl.x);
    xlabels += `<text x="${x.toFixed(1)}" y="${H - padB + 16}" class="axis-label x">${esc(xl.label)}</text>`;
  }

  const paths = series
    .map((s) => {
      const pts = s.points.filter((p): p is LinePoint & { y: number } => p.y !== null);
      if (!pts.length) return '';
      let d = '';
      pts.forEach((p, idx) => {
        d += `${idx === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)} `;
      });
      let area = '';
      if (s.fill) {
        const first = sx(pts[0].x);
        const last = sx(pts[pts.length - 1].x);
        area = `<path d="${d}L${last.toFixed(1)},${(padT + plotH).toFixed(1)} L${first.toFixed(1)},${(padT + plotH).toFixed(1)} Z" fill="${s.color}" opacity="0.10" />`;
      }
      return `${area}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" />`;
    })
    .join('');

  // hover dots (one per x for the first series) — invisible hit targets
  const hit = (series[0]?.points ?? [])
    .map((p) => {
      const x = sx(p.x);
      const tipParts = series
        .map((s) => {
          const sp = s.points.find((q) => q.x === p.x);
          return sp && sp.y !== null ? `${s.name}: ${sp.y.toFixed(1)}${opts.yUnit ?? ''}` : null;
        })
        .filter(Boolean);
      const tip = `${p.label} · ${tipParts.join(' · ')}`;
      return `<rect x="${(x - plotW / (series[0].points.length * 2)).toFixed(1)}" y="${padT}" width="${(plotW / series[0].points.length).toFixed(1)}" height="${plotH}" fill="transparent" data-tip="${esc(tip)}" />`;
    })
    .join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="line-chart" preserveAspectRatio="xMidYMid meet" role="img">
    ${grid}${markers}${xlabels}${paths}${hit}
  </svg>`;
}

/** Tiny inline sparkline. */
export function sparkline(values: (number | null)[], color: string, w = 120, h = 28): string {
  const ys = values.filter((v): v is number => v !== null);
  if (ys.length < 2) return '';
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const sx = (i: number) => (i / (values.length - 1)) * w;
  const sy = (y: number) => h - ((y - min) / (max - min || 1)) * (h - 4) - 2;
  let d = '';
  let started = false;
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${started ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)} `;
    started = true;
  });
  return `<svg viewBox="0 0 ${w} ${h}" class="sparkline" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" /></svg>`;
}
