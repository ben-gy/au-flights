# Site Plan: Flight Delays (AU)

## Overview
- **Name:** Flight Delays (AU)
- **Repo name:** au-flights
- **Tagline:** Which Australian domestic flights actually run on time — 22 years of punctuality, delays and cancellations for every major route and airline.

### Naming Convention
Country-specific → "Flight Delays (AU)". Repo `au-flights`.

## Target Audience
Australian travellers deciding which airline or flight to book ("is Jetstar or Virgin more reliable on Melbourne–Sydney?"), nervous flyers with tight connections, journalists and aviation watchers tracking airline collapses (Bonza, Tigerair, Rex regional), and frequent flyers comparing routes. Mostly consumers on phone and desktop, low domain knowledge, wanting a fast, trustworthy answer.

## Value Proposition
BITRE publishes this as a 9.6 MB CSV with 118,000 rows — useless to a normal traveller. This turns it into an instant, searchable answer: pick a route or airline and see on-time %, cancellation rate, how it compares to the field, and 22 years of trend. No other consumer site presents the full BITRE on-time series interactively with a route map, network graph and airline leaderboards.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| BITRE Domestic Airline On Time Performance | https://data.gov.au/data/dataset/domestic-airline-on-time-performance | Monthly punctuality, delays, cancellations by route + airline, Nov 2003–present | Monthly | No |
| Curated airport coordinates | (embedded) | Lat/lon for the 44 reporting airports, for the map | Static | No |

## Key Features
1. **Airline leaderboard** — rank reporting airlines by on-time arrival % and cancellation rate (recent 12 months), colour-coded vs the industry median.
2. **Route explorer** — search/sort all 160 competitive routes; on-time %, cancellations, busiest, drill-down per route with airline breakdown + trend.
3. **Route map (Leaflet)** — 44 airports plotted, routes drawn as lines coloured by on-time %; click an airport/route for detail.
4. **Network graph** — force-directed airport-pair graph, edge colour = reliability, node size = traffic.
5. **National trend** — 22-year time series of on-time % and cancellation rate, with the COVID-19 collapse, airline failures and seasonal patterns visible.
6. **Airline × airport matrix heatmap** — which carrier runs on time out of which hub.
7. **Seasonality view** — month-of-year averages: when in the year are delays worst.
8. **Auto insights** — anomaly detection: worst/best routes, biggest cancellation spikes, most improved/worsened airlines.

## Target Audience (detailed)
Everyday travellers, often on a phone, comparing two options before booking — low patience, want a headline number and a simple comparison. Secondary: data-curious frequent flyers and journalists on desktop who will dig into trends and drill-downs. Emotional context: mild anxiety (will my flight be cancelled / will I make my connection), so the tone should be calm, factual and reassuring, never alarmist.

## Style Direction
**Tone:** friendly/consumer, trustworthy, calm.
**Colour palette:** clean light theme, white surfaces, sky/aviation blue accent (`#0284c7`), with a green→amber→red performance scale for on-time rates. Feels like a modern travel/airline app, not a terminal.
**UI density:** balanced — card-based leaderboards and a dense sortable route table, generous whitespace on overview.
**Dark/light theme:** light (general consumer audience).
**Reference sites for tone:** flightradar24's clean data panels; fuelaustralia.org's simple practical utility.

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite.
- **Data strategy:** pipeline — a Node script downloads the BITRE CSV, aggregates into compact JSON in `public/data/`, committed and refreshed monthly via GitHub Actions.
- **Key libraries:** Leaflet (map). All charts (bars, time series, network, heatmap, treemap, histogram) hand-rolled in SVG — no chart library.

## Layout
Fixed light header (logo, global search, About + theme). Sticky tab bar for the 8 views. Main content max-width 1600px, scrolls normally. Footer pinned to viewport bottom (flex sticky-footer). Below 768px: cards stack, table becomes horizontally scrollable, tab bar scrolls.

## Pages/Views
Single-page app, tabbed views:
1. Overview (national stat cards + 22-year trend + top/bottom routes)
2. Airlines (leaderboard + per-airline trend)
3. Routes (sortable table + route drill-down panel)
4. Map (Leaflet airports + route lines)
5. Network (force-directed graph)
6. Matrix (airline × airport heatmap)
7. Seasonality (month-of-year + year heatmap)
8. Insights (auto-detected findings)

## Visualization Strategy
- **Table view** (Routes) — sortable/filterable, the workhorse for "find my route". Always include.
- **Horizontal bar charts** (Airlines leaderboard, top/bottom routes) — instant ranking by on-time % and cancellation rate. Colour = performance band.
- **Time-series line/area** (National trend, per-airline, per-route) — shows the COVID collapse, airline failures, seasonality; nothing else conveys the 22-year story.
- **Leaflet map** — geographic: where the reliable vs unreliable routes are; regional vs trunk routes.
- **Force-directed network graph** — airports connect to airports; reveals hub structure and which connections are weak links. Filter by airline.
- **Cross-reference matrix heatmap** (airline × airport) — instantly shows which carrier is reliable out of which hub; reveals carriers that span many hubs.
- **Seasonality heatmap** (year × month) — distribution of delays across the calendar; surfaces seasonal and one-off shocks.
- **Histogram** (distribution of route on-time %) — shows spread and outliers across the 160 routes.

Colour rule: each airline gets one fixed colour used across leaderboard, trend, network and matrix. On-time % always uses the same green→amber→red scale everywhere.
