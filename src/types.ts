// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export interface Rates {
  sched: number;
  flown: number;
  canc: number;
  arrOnTime: number;
  depOnTime: number;
  arrDelayed: number;
  otpArr: number | null;
  otpDep: number | null;
  cancelRate: number | null;
}

export interface AirlineSeriesPoint {
  ym: string;
  flown: number;
  canc: number;
  otpArr: number | null;
  cancelRate: number | null;
}

export interface Airline {
  name: string;
  slug: string;
  color: string;
  active: boolean;
  firstYm: string;
  lastYm: string;
  allTime: Rates;
  recent12: Rates | null;
  series: AirlineSeriesPoint[];
}

export interface RouteAirline {
  name: string;
  slug: string;
  color: string;
  flown: number;
  otpArr: number | null;
  cancelRate: number | null;
}

export interface Route {
  route: string;
  dep: string;
  arr: string;
  recent12: Rates;
  airlines: RouteAirline[];
  series: AirlineSeriesPoint[];
}

export interface Airport {
  name: string;
  flown: number;
  canc: number;
  otpDep: number | null;
  otpArr: number | null;
  cancelRate: number | null;
  routes: number;
  destinations: string[];
}

export interface NationalPoint extends Rates {
  ym: string;
  year: number;
  month: number;
}

export interface SeasonalPoint {
  month: number;
  otpArr: number | null;
  cancelRate: number | null;
  n: number;
}

export interface Summary {
  generated: string;
  latestYm: string;
  latestLabel: string;
  firstYm: string;
  firstLabel: string;
  months: number;
  routes: number;
  airports: number;
  airlinesReporting: number;
  latestNational: Rates | null;
  recent12National: Rates;
  allTimeNational: Rates;
}

export interface AppData {
  summary: Summary;
  airlines: Airline[];
  routes: Route[];
  airports: Airport[];
  national: { series: NationalPoint[]; seasonal: SeasonalPoint[] };
}
