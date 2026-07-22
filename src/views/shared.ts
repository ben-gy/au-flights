// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import { esc, formatPct, otpColor, cancelColor, otpBand, cancelBand } from '../format.ts';

/** A coloured performance pill for an on-time %. */
export function otpPill(pct: number | null, label = ''): string {
  const band = otpBand(pct);
  return `<span class="pill pill-${band}" style="--pill:${otpColor(pct)}">${formatPct(pct)}${label ? ` ${esc(label)}` : ''}</span>`;
}

/** A coloured performance pill for a cancellation %. */
export function cancelPill(pct: number | null): string {
  const band = cancelBand(pct);
  return `<span class="pill pill-${band}" style="--pill:${cancelColor(pct)}">${formatPct(pct)}</span>`;
}

export interface StatCard {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tip?: string;
}

export function statCards(cards: StatCard[]): string {
  return `<div class="stat-grid">${cards
    .map(
      (c) => `<div class="stat-card"${c.tip ? ` data-tip="${esc(c.tip)}"` : ''}>
        <div class="stat-value" ${c.color ? `style="color:${c.color}"` : ''}>${c.value}</div>
        <div class="stat-label">${esc(c.label)}</div>
        ${c.sub ? `<div class="stat-sub">${esc(c.sub)}</div>` : ''}
      </div>`,
    )
    .join('')}</div>`;
}

export function sectionTitle(title: string, subtitle?: string): string {
  return `<div class="section-head"><h2>${esc(title)}</h2>${subtitle ? `<p class="section-sub">${subtitle}</p>` : ''}</div>`;
}

/** Performance scale legend (green/amber/red). */
export function perfLegend(kind: 'otp' | 'cancel'): string {
  const rows =
    kind === 'otp'
      ? [
          ['#16a34a', '80%+ on time'],
          ['#d97706', '70–80%'],
          ['#dc2626', 'under 70%'],
        ]
      : [
          ['#16a34a', 'under 2% cancelled'],
          ['#d97706', '2–4%'],
          ['#dc2626', 'over 4%'],
        ];
  return `<div class="legend">${rows
    .map(([c, l]) => `<span class="legend-item"><span class="legend-dot" style="background:${c}"></span>${esc(l)}</span>`)
    .join('')}</div>`;
}
