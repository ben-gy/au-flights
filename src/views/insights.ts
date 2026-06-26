import type { AppData } from '../types.ts';
import { esc } from '../format.ts';
import { buildInsights, type Insight } from '../analysis.ts';

const ICON: Record<Insight['severity'], string> = {
  alert: '▲',
  warn: '!',
  info: 'i',
  good: '✓',
};

function card(ins: Insight): string {
  const inner = `
    <span class="insight-icon insight-${ins.severity}">${ICON[ins.severity]}</span>
    <div class="insight-body">
      <h3>${esc(ins.title)}</h3>
      <p>${esc(ins.detail)}</p>
    </div>`;
  return ins.link
    ? `<a class="insight-card" href="${esc(ins.link)}">${inner}<span class="insight-go">→</span></a>`
    : `<div class="insight-card">${inner}</div>`;
}

export function render(data: AppData): string {
  const insights = buildInsights(data);
  return `
    <section class="view">
      <div class="section-head">
        <h1>What the data says</h1>
        <p class="section-sub">
          Automatically generated findings from the latest 12 months and the full 22-year record.
          Tap a card to dig into the underlying view.
        </p>
      </div>
      <div class="insight-grid">
        ${insights.map(card).join('')}
      </div>
      <p class="chart-note">Findings are recomputed every time BITRE publishes new data, so they always reflect the most recent month (${esc(data.summary.latestLabel)}).</p>
    </section>`;
}
