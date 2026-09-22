# Flight Delays (AU) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-flights/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-flights.benrichardson.dev *(live after DNS + cert below)*

## What it is

An interactive explorer for the BITRE Domestic Airline On Time Performance dataset — 22 years (118,000 rows) of on-time, delay and cancellation figures for every competitive Australian domestic route and airline. Nine views: overview, airline leaderboard, sortable route table with drill-down, 22-year trend, seasonality heatmap, Leaflet map, force-directed network graph, airline × airport matrix, and auto-generated insights.

## DNS setup

Already created in Cloudflare (`benrichardson.dev` zone):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-flights` | `ben-gy.github.io` | DNS only (grey cloud) |

If the cert ever needs re-triggering:
```bash
gh api repos/ben-gy/au-flights/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/au-flights/pages -X PUT -f cname="au-flights.benrichardson.dev"
```
