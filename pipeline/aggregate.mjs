// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Aggregates the BITRE OTP CSV into compact JSON for the frontend.
// Reads pipeline/otp.csv, writes public/data/*.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = join(__dirname, 'otp.csv');
const OUT_DIR = join(__dirname, '..', 'public', 'data');

// ── Airline name normalisation (merge brand variants) ──
const NAME_FIX = {
  'virgin Australia': 'Virgin Australia',
  'Regional Express': 'Rex Airlines',
  'Skytrans Australia': 'Skytrans',
  MacAir: 'Macair',
};
const norm = (n) => NAME_FIX[n] || n;

// ── Airline display metadata (colour reused across every view) ──
const AIRLINE_META = {
  'All Airlines': { slug: 'all', color: '#0284c7' },
  Qantas: { slug: 'qantas', color: '#d32f2f' },
  QantasLink: { slug: 'qantaslink', color: '#ef6c00' },
  Jetstar: { slug: 'jetstar', color: '#f9a825' },
  'Virgin Australia': { slug: 'virgin', color: '#6a1b9a' },
  'Virgin Australia Regional Airlines': { slug: 'vara', color: '#8e24aa' },
  'Virgin Australia - ATR/F100 Operations': { slug: 'vaatr', color: '#9c27b0' },
  'Rex Airlines': { slug: 'rex', color: '#c2185b' },
  'Tigerair Australia': { slug: 'tigerair', color: '#fb8c00' },
  Bonza: { slug: 'bonza', color: '#00897b' },
  Skywest: { slug: 'skywest', color: '#5e35b1' },
  Hinterland: { slug: 'hinterland', color: '#00838f' },
  Skytrans: { slug: 'skytrans', color: '#00695c' },
  Macair: { slug: 'macair', color: '#455a64' },
  Ozjet: { slug: 'ozjet', color: '#546e7a' },
  'SmartLynx Australia': { slug: 'smartlynx', color: '#78909c' },
};
const metaFor = (name) =>
  AIRLINE_META[name] || { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), color: '#90a4ae' };

const r1 = (x) => Math.round(x * 10) / 10;
const pct = (num, den) => (den > 0 ? r1((num / den) * 100) : null);
const idxOf = (year, m) => year * 12 + (m - 1);

function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(',');
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const f = line.split(',');
    if (f.length < header.length) continue;
    rows.push({
      route: f[col.Route],
      dep: f[col.Departing_Port],
      arr: f[col.Arriving_Port],
      airline: norm(f[col.Airline]),
      sched: +f[col.Sectors_Scheduled] || 0,
      flown: +f[col.Sectors_Flown] || 0,
      canc: +f[col.Cancellations] || 0,
      depOnTime: +f[col.Departures_On_Time] || 0,
      arrOnTime: +f[col.Arrivals_On_Time] || 0,
      depDelayed: +f[col.Departures_Delayed] || 0,
      arrDelayed: +f[col.Arrivals_Delayed] || 0,
      year: +f[col.Year],
      month: +f[col.Month_Num],
    });
  }
  return rows;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function rates(a) {
  return {
    sched: Math.round(a.sched),
    flown: Math.round(a.flown),
    canc: Math.round(a.canc),
    arrOnTime: Math.round(a.arrOnTime),
    depOnTime: Math.round(a.depOnTime),
    arrDelayed: Math.round(a.arrDelayed),
    otpArr: pct(a.arrOnTime, a.flown),
    otpDep: pct(a.depOnTime, a.flown),
    cancelRate: pct(a.canc, a.sched),
  };
}

const blank = () => ({
  sched: 0,
  flown: 0,
  canc: 0,
  depOnTime: 0,
  arrOnTime: 0,
  depDelayed: 0,
  arrDelayed: 0,
});
function add(acc, row) {
  acc.sched += row.sched;
  acc.flown += row.flown;
  acc.canc += row.canc;
  acc.depOnTime += row.depOnTime;
  acc.arrOnTime += row.arrOnTime;
  acc.depDelayed += row.depDelayed;
  acc.arrDelayed += row.arrDelayed;
}

async function main() {
  const text = await readFile(CSV, 'utf8');
  const rows = parseCsv(text);
  process.stdout.write(`Parsed ${rows.length} rows\n`);

  let latestIdx = -Infinity;
  let firstIdx = Infinity;
  for (const r of rows) {
    const ix = idxOf(r.year, r.month);
    if (ix > latestIdx) latestIdx = ix;
    if (ix < firstIdx) firstIdx = ix;
  }
  const rec12 = (r) => idxOf(r.year, r.month) > latestIdx - 12;
  const latestYear = Math.floor(latestIdx / 12);
  const latestMonth = (latestIdx % 12) + 1;
  const ymOf = (r) => `${r.year}-${pad2(r.month)}`;

  // ── National time series (All Ports / All Airlines) ──
  const nationalByYm = new Map();
  for (const r of rows) {
    if (r.dep !== 'All Ports' || r.airline !== 'All Airlines') continue;
    nationalByYm.set(ymOf(r), r);
  }
  const nationalSeries = [...nationalByYm.values()]
    .sort((a, b) => idxOf(a.year, a.month) - idxOf(b.year, b.month))
    .map((r) => ({ ym: ymOf(r), year: r.year, month: r.month, ...rates(r) }));

  // seasonal averages of OTP arrival & cancel rate by month-of-year (exclude COVID 2020-2021)
  const seasonalAcc = Array.from({ length: 12 }, () => ({ otp: 0, canc: 0, n: 0 }));
  for (const p of nationalSeries) {
    if (p.year === 2020 || p.year === 2021) continue;
    if (p.otpArr == null) continue;
    const s = seasonalAcc[p.month - 1];
    s.otp += p.otpArr;
    s.canc += p.cancelRate ?? 0;
    s.n += 1;
  }
  const seasonal = seasonalAcc.map((s, i) => ({
    month: i + 1,
    otpArr: s.n ? r1(s.otp / s.n) : null,
    cancelRate: s.n ? r1(s.canc / s.n) : null,
    n: s.n,
  }));

  // ── Airlines (network 'All Ports' rows) ──
  const airlineAll = new Map(); // name -> all-time acc
  const airlineRec = new Map(); // name -> recent12 acc
  const airlineSeries = new Map(); // name -> [points]
  const airlineSpan = new Map(); // name -> {first, last}
  for (const r of rows) {
    if (r.dep !== 'All Ports') continue;
    if (r.airline === 'All Airlines') continue;
    if (!airlineAll.has(r.airline)) {
      airlineAll.set(r.airline, blank());
      airlineSeries.set(r.airline, []);
    }
    add(airlineAll.get(r.airline), r);
    airlineSeries.get(r.airline).push({ ym: ymOf(r), ...rates(r) });
    const span = airlineSpan.get(r.airline) || { first: Infinity, last: -Infinity };
    const ix = idxOf(r.year, r.month);
    span.first = Math.min(span.first, ix);
    span.last = Math.max(span.last, ix);
    airlineSpan.set(r.airline, span);
    if (rec12(r)) {
      if (!airlineRec.has(r.airline)) airlineRec.set(r.airline, blank());
      add(airlineRec.get(r.airline), r);
    }
  }
  const airlines = [...airlineAll.keys()]
    .map((name) => {
      const meta = metaFor(name);
      const span = airlineSpan.get(name);
      const recAcc = airlineRec.get(name);
      const series = airlineSeries
        .get(name)
        .sort((a, b) => (a.ym < b.ym ? -1 : 1))
        .map((p) => ({ ym: p.ym, flown: p.flown, canc: p.canc, otpArr: p.otpArr, cancelRate: p.cancelRate }));
      return {
        name,
        slug: meta.slug,
        color: meta.color,
        active: span.last > latestIdx - 12,
        firstYm: `${Math.floor(span.first / 12)}-${pad2((span.first % 12) + 1)}`,
        lastYm: `${Math.floor(span.last / 12)}-${pad2((span.last % 12) + 1)}`,
        allTime: rates(airlineAll.get(name)),
        recent12: recAcc ? rates(recAcc) : null,
        series,
      };
    })
    .sort((a, b) => b.allTime.flown - a.allTime.flown);

  // ── Routes (All Airlines route rows + per-airline route rows) ──
  const routeRec = new Map(); // route -> acc (All Airlines)
  const routeSeries = new Map(); // route -> [All Airlines points]
  const routeMeta = new Map(); // route -> {dep, arr}
  const routeAirlineRec = new Map(); // route -> Map(airline -> acc)
  for (const r of rows) {
    if (r.route === 'All Ports-All Ports') continue;
    if (r.dep === 'All Ports') continue;
    routeMeta.set(r.route, { dep: r.dep, arr: r.arr });
    if (r.airline === 'All Airlines') {
      if (!routeSeries.has(r.route)) routeSeries.set(r.route, []);
      routeSeries.get(r.route).push({ ym: ymOf(r), idx: idxOf(r.year, r.month), ...rates(r) });
      if (rec12(r)) {
        if (!routeRec.has(r.route)) routeRec.set(r.route, blank());
        add(routeRec.get(r.route), r);
      }
    } else if (rec12(r)) {
      if (!routeAirlineRec.has(r.route)) routeAirlineRec.set(r.route, new Map());
      const m = routeAirlineRec.get(r.route);
      if (!m.has(r.airline)) m.set(r.airline, blank());
      add(m.get(r.airline), r);
    }
  }
  const routes = [...routeMeta.keys()]
    .filter((route) => routeRec.has(route))
    .map((route) => {
      const { dep, arr } = routeMeta.get(route);
      const recAcc = routeRec.get(route);
      const series = (routeSeries.get(route) || [])
        .filter((p) => p.idx > latestIdx - 72)
        .sort((a, b) => a.idx - b.idx)
        .map((p) => ({ ym: p.ym, flown: p.flown, canc: p.canc, otpArr: p.otpArr, cancelRate: p.cancelRate }));
      const airlineMap = routeAirlineRec.get(route) || new Map();
      const byAirline = [...airlineMap.entries()]
        .map(([name, acc]) => {
          const meta = metaFor(name);
          const rt = rates(acc);
          return {
            name,
            slug: meta.slug,
            color: meta.color,
            flown: rt.flown,
            otpArr: rt.otpArr,
            cancelRate: rt.cancelRate,
          };
        })
        .filter((a) => a.flown > 0)
        .sort((a, b) => b.flown - a.flown);
      return { route, dep, arr, recent12: rates(recAcc), airlines: byAirline, series };
    })
    .sort((a, b) => b.recent12.flown - a.recent12.flown);

  // ── Airports (as departure port, All Airlines route rows, recent 12) ──
  const airportAcc = new Map(); // name -> {acc, dests:Set}
  for (const r of rows) {
    if (r.airline !== 'All Airlines') continue;
    if (r.dep === 'All Ports' || r.route === 'All Ports-All Ports') continue;
    if (!rec12(r)) continue;
    if (!airportAcc.has(r.dep)) airportAcc.set(r.dep, { acc: blank(), dests: new Set() });
    const a = airportAcc.get(r.dep);
    add(a.acc, r);
    a.dests.add(r.arr);
  }
  const airports = [...airportAcc.entries()]
    .map(([name, { acc, dests }]) => {
      const rt = rates(acc);
      return {
        name,
        flown: rt.flown,
        canc: rt.canc,
        otpDep: rt.otpDep,
        otpArr: rt.otpArr,
        cancelRate: rt.cancelRate,
        routes: dests.size,
        destinations: [...dests].sort(),
      };
    })
    .sort((a, b) => b.flown - a.flown);

  // ── Summary ──
  const latestNat = nationalByYm.get(`${latestYear}-${pad2(latestMonth)}`);
  const rec12NatAcc = blank();
  for (const r of rows) {
    if (r.dep === 'All Ports' && r.airline === 'All Airlines' && rec12(r)) add(rec12NatAcc, r);
  }
  const allTimeNatAcc = blank();
  for (const r of rows) {
    if (r.dep === 'All Ports' && r.airline === 'All Airlines') add(allTimeNatAcc, r);
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const summary = {
    generated: process.env.GENERATED_AT || new Date().toISOString().slice(0, 10),
    latestYm: `${latestYear}-${pad2(latestMonth)}`,
    latestLabel: `${MONTHS[latestMonth - 1]} ${latestYear}`,
    firstYm: `${Math.floor(firstIdx / 12)}-${pad2((firstIdx % 12) + 1)}`,
    firstLabel: `${MONTHS[firstIdx % 12]} ${Math.floor(firstIdx / 12)}`,
    months: latestIdx - firstIdx + 1,
    routes: routes.length,
    airports: airports.length,
    airlinesReporting: airlines.filter((a) => a.active).length,
    latestNational: latestNat ? rates(latestNat) : null,
    recent12National: rates(rec12NatAcc),
    allTimeNational: rates(allTimeNatAcc),
  };

  await mkdir(OUT_DIR, { recursive: true });
  const write = (name, obj) => writeFile(join(OUT_DIR, name), JSON.stringify(obj), 'utf8');
  await write('summary.json', summary);
  await write('airlines.json', airlines);
  await write('routes.json', routes);
  await write('airports.json', airports);
  await write('national.json', { series: nationalSeries, seasonal });

  process.stdout.write(
    `Wrote ${airlines.length} airlines, ${routes.length} routes, ${airports.length} airports, ` +
      `${nationalSeries.length} national months. Latest: ${summary.latestLabel}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`aggregate.mjs failed: ${err.stack}\n`);
  process.exit(1);
});
