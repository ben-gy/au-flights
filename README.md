# Flight Delays (AU)

**Which Australian domestic flights actually run on time — 22 years of punctuality, delays and cancellations for every major route and airline.**

🔗 **Live:** [https://au-flights.benrichardson.dev](https://au-flights.benrichardson.dev)

## What is this?

Every month the Australian Government's Bureau of Infrastructure and Transport Research Economics (BITRE) publishes on-time performance figures for the country's domestic airlines. The raw data is a 9.6 MB CSV with 118,000 rows going back to 2004 — accurate, authoritative and almost impossible for a normal traveller to use.

**Flight Delays (AU)** turns that data into a fast, searchable tool. Pick a route or an airline and instantly see how often flights arrive on time, how often they're cancelled, how it compares to the rest of the industry, and how it has trended over 22 years. It answers the questions travellers actually ask: *Is Qantas or Virgin more reliable on Melbourne–Sydney? Which route should I avoid? When in the year are delays worst?*

The data is refreshed automatically within days of each BITRE release via a GitHub Actions pipeline, so the figures always reflect the latest published month.

## Who is this for?

Australian travellers comparing airlines and routes before they book, nervous flyers with tight connections, frequent flyers tracking reliability, and journalists or aviation watchers following airline performance and collapses (Bonza, Tigerair, Rex regional). It's built consumer-first — clean, light, and readable on a phone — with enough depth (drill-downs, a 22-year trend, a route network graph) to reward digging.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| [BITRE Domestic Airline On Time Performance](https://data.gov.au/data/dataset/domestic-airline-on-time-performance) | Monthly on-time arrivals/departures, delays and cancellations by route and airline, Nov 2003–present | Monthly |
| Curated airport coordinates | Latitude/longitude and IATA codes for the 44 reporting airports (for the map) | Static |

## Features

- **Airline leaderboard** — every reporting airline ranked by on-time arrival rate and cancellation rate, with year-on-year trend arrows and sparklines. Tap for a full 22-year history.
- **Route explorer** — a sortable, filterable table of all competitive routes with a deep-linkable slide-in drill-down (airline breakdown + trend) for each.
- **Interactive map** — Leaflet map of all 44 airports and the routes between them, coloured by on-time rate.
- **Route network graph** — a hand-rolled force-directed graph revealing hub structure, filterable by airline.
- **22-year trend** — monthly industry on-time and cancellation rates, with the COVID-19 collapse and other shocks marked.
- **Airline × airport matrix** — a heatmap showing which carrier runs on time out of which hub.
- **Seasonality view** — month-of-year averages plus a full year × month heatmap.
- **Auto-generated insights** — anomaly detection surfacing the worst/best routes, biggest cancellation spikes and most improved/worsened airlines.
- **Plain-language glossary** — click-to-reveal definitions on every piece of jargon, plus an About panel.

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest (51 tests)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline → pre-aggregated JSON in `public/data/`
- **Maps:** Leaflet + CARTO basemap. All other charts (bars, line charts, network graph, heatmaps, sparklines) are hand-rolled SVG — no chart library.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview

# Refresh the data from BITRE
node pipeline/collect.mjs && node pipeline/aggregate.mjs
```

## How it works

A Node script (`pipeline/collect.mjs`) downloads the BITRE CSV. A second script (`pipeline/aggregate.mjs`) parses all 118,000 rows and pre-computes compact JSON: airline rollups with monthly time series, per-route figures with airline breakdowns and trends, airport aggregates, and the national monthly series. These land in `public/data/` and are committed by the `Data Pipeline` GitHub Action on a cron schedule. The frontend fetches those JSON files on load and renders everything client-side — all insights, rankings and charts are derived in the browser, so there is no server to run.

## License

MIT
