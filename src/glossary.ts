// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Plain-language definitions for every piece of jargon used in the UI.
// Rendered as click-to-reveal tooltips via glossary-ui.ts.
export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'on-time arrival': {
    term: 'On-time arrival',
    definition:
      'A flight counts as arriving on time if it reaches the gate less than 15 minutes after its scheduled arrival time. Cancelled and diverted flights never count as on time.',
  },
  'on-time departure': {
    term: 'On-time departure',
    definition:
      'A flight counts as departing on time if it leaves the gate less than 15 minutes after its scheduled departure time.',
  },
  cancellation: {
    term: 'Cancellation',
    definition:
      'A flight removed from the schedule within 7 days of its planned departure. Last-minute cancellations are the most disruptive for travellers.',
  },
  'cancellation rate': {
    term: 'Cancellation rate',
    definition:
      'The share of scheduled flights that were cancelled. Calculated as cancellations ÷ scheduled flights. Lower is better — under 2% is considered good.',
  },
  'on-time rate': {
    term: 'On-time rate',
    definition:
      'The share of flown flights that arrived on time (within 15 minutes of schedule). Calculated as on-time arrivals ÷ flights flown. Higher is better — 80% or above is considered good.',
  },
  sector: {
    term: 'Sector',
    definition:
      'A single flight between two airports — one take-off and one landing. BITRE counts performance in sectors rather than passengers.',
  },
  'sectors scheduled': {
    term: 'Sectors scheduled',
    definition: 'The number of flights an airline planned to operate on a route or network in the month.',
  },
  'sectors flown': {
    term: 'Sectors flown',
    definition: 'The number of scheduled flights that actually operated (scheduled flights minus cancellations).',
  },
  route: {
    term: 'Route',
    definition:
      'A directional city pair, e.g. Sydney → Melbourne. The return direction (Melbourne → Sydney) is counted as a separate route because delays often differ by direction.',
  },
  bitre: {
    term: 'BITRE',
    definition:
      'The Bureau of Infrastructure and Transport Research Economics — the Australian Government body that collects and publishes this on-time performance data each month.',
  },
  'competitive route': {
    term: 'Competitive route',
    definition:
      'BITRE only publishes a route once it averages 8,000+ passengers a month and two or more airlines compete on it. Smaller and monopoly routes are not individually reported.',
  },
  delayed: {
    term: 'Delayed',
    definition:
      'A flight that arrived (or departed) 15 minutes or more after its scheduled time. It is the opposite of on time.',
  },
  'reporting airline': {
    term: 'Reporting airline',
    definition:
      'An airline that submits monthly performance figures to BITRE. Together the reporting airlines carry more than 95% of Australia’s domestic passengers.',
  },
};
