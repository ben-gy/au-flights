import type { Summary } from './types.ts';
import { esc } from './format.ts';

export function openAbout(summary: Summary): void {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <button class="modal-close" aria-label="Close">×</button>
      <h2 id="about-title">About Flight Delays (AU)</h2>
      <p>
        <strong>Flight Delays (AU)</strong> turns the Australian Government's official on-time
        performance data into a fast, searchable tool for travellers. Compare airlines and routes
        by how often they actually run on time, how often they cancel, and how that has changed over
        the last 22 years.
      </p>
      <h3>Where the data comes from</h3>
      <p>
        Every figure here is sourced from the
        <strong>Bureau of Infrastructure and Transport Research Economics (BITRE)</strong>
        "Domestic Airlines — On Time Performance" dataset, published on
        <a href="https://data.gov.au/data/dataset/domestic-airline-on-time-performance" target="_blank" rel="noopener">data.gov.au</a>.
        Airlines report their figures to BITRE each month, and the figures are audited before release.
      </p>
      <h3>What the data covers</h3>
      <ul>
        <li>Coverage runs from <strong>${esc(summary.firstLabel)}</strong> to <strong>${esc(summary.latestLabel)}</strong> (${summary.months} months).</li>
        <li>${summary.routes} competitive city-pair routes and ${summary.airports} airports with recent traffic.</li>
        <li>${summary.airlinesReporting} airlines currently report; together they carry 95%+ of domestic passengers.</li>
        <li>A route is published only once it averages 8,000+ passengers a month and two or more airlines compete on it. Smaller and monopoly routes are not individually reported.</li>
      </ul>
      <h3>How the numbers are defined</h3>
      <ul>
        <li><strong>On time</strong> means arriving (or departing) the gate within 15 minutes of the scheduled time.</li>
        <li>A <strong>cancellation</strong> is a flight pulled from the schedule within 7 days of departure.</li>
        <li><strong>On-time rate</strong> = on-time arrivals ÷ flights flown. <strong>Cancellation rate</strong> = cancellations ÷ flights scheduled.</li>
        <li>"Recent" figures use the most recent rolling 12 months of data.</li>
      </ul>
      <h3>Updates &amp; caveats</h3>
      <p>
        BITRE publishes monthly; this site refreshes automatically from the source within days of each
        release. The data measures punctuality, not safety — a delayed flight is still a safe flight.
        Performance is measured in flights (sectors), not passengers.
      </p>
      <p class="modal-foot">
        Data is published under CC BY 4.0 by BITRE. This is an independent tool and is not affiliated
        with BITRE, any airline, or the Australian Government.
      </p>
    </div>`;

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.modal-close')?.addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });
  document.body.appendChild(overlay);
}
