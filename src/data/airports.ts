// Curated coordinates and IATA codes for the airports that appear in the BITRE
// on-time performance dataset. Used by the map and for labelling.
export interface AirportInfo {
  name: string;
  code: string;
  lat: number;
  lon: number;
  state: string;
}

export const AIRPORTS: Record<string, AirportInfo> = {
  Adelaide: { name: 'Adelaide', code: 'ADL', lat: -34.945, lon: 138.531, state: 'SA' },
  Albury: { name: 'Albury', code: 'ABX', lat: -36.068, lon: 146.958, state: 'NSW' },
  'Alice Springs': { name: 'Alice Springs', code: 'ASP', lat: -23.807, lon: 133.902, state: 'NT' },
  Armidale: { name: 'Armidale', code: 'ARM', lat: -30.528, lon: 151.617, state: 'NSW' },
  'Ayers Rock': { name: 'Ayers Rock', code: 'AYQ', lat: -25.186, lon: 130.976, state: 'NT' },
  Ballina: { name: 'Ballina', code: 'BNK', lat: -28.834, lon: 153.562, state: 'NSW' },
  Brisbane: { name: 'Brisbane', code: 'BNE', lat: -27.384, lon: 153.117, state: 'QLD' },
  Broome: { name: 'Broome', code: 'BME', lat: -17.945, lon: 122.232, state: 'WA' },
  Bundaberg: { name: 'Bundaberg', code: 'BDB', lat: -24.904, lon: 152.319, state: 'QLD' },
  Burnie: { name: 'Burnie', code: 'BWT', lat: -40.999, lon: 145.731, state: 'TAS' },
  Cairns: { name: 'Cairns', code: 'CNS', lat: -16.885, lon: 145.755, state: 'QLD' },
  Canberra: { name: 'Canberra', code: 'CBR', lat: -35.307, lon: 149.195, state: 'ACT' },
  'Coffs Harbour': { name: 'Coffs Harbour', code: 'CFS', lat: -30.321, lon: 153.116, state: 'NSW' },
  Darwin: { name: 'Darwin', code: 'DRW', lat: -12.415, lon: 130.877, state: 'NT' },
  Devonport: { name: 'Devonport', code: 'DPO', lat: -41.17, lon: 146.43, state: 'TAS' },
  Dubbo: { name: 'Dubbo', code: 'DBO', lat: -32.217, lon: 148.575, state: 'NSW' },
  Emerald: { name: 'Emerald', code: 'EMD', lat: -23.567, lon: 148.179, state: 'QLD' },
  Geraldton: { name: 'Geraldton', code: 'GET', lat: -28.796, lon: 114.707, state: 'WA' },
  Gladstone: { name: 'Gladstone', code: 'GLT', lat: -23.87, lon: 151.223, state: 'QLD' },
  'Gold Coast': { name: 'Gold Coast', code: 'OOL', lat: -28.164, lon: 153.505, state: 'QLD' },
  'Hamilton Island': { name: 'Hamilton Island', code: 'HTI', lat: -20.358, lon: 148.952, state: 'QLD' },
  'Hervey Bay': { name: 'Hervey Bay', code: 'HVB', lat: -25.319, lon: 152.88, state: 'QLD' },
  Hobart: { name: 'Hobart', code: 'HBA', lat: -42.836, lon: 147.51, state: 'TAS' },
  Kalgoorlie: { name: 'Kalgoorlie', code: 'KGI', lat: -30.789, lon: 121.462, state: 'WA' },
  Karratha: { name: 'Karratha', code: 'KTA', lat: -20.712, lon: 116.773, state: 'WA' },
  Launceston: { name: 'Launceston', code: 'LST', lat: -41.545, lon: 147.214, state: 'TAS' },
  Mackay: { name: 'Mackay', code: 'MKY', lat: -21.172, lon: 149.18, state: 'QLD' },
  Melbourne: { name: 'Melbourne', code: 'MEL', lat: -37.673, lon: 144.843, state: 'VIC' },
  Mildura: { name: 'Mildura', code: 'MQL', lat: -34.229, lon: 142.086, state: 'VIC' },
  Moranbah: { name: 'Moranbah', code: 'MOV', lat: -22.058, lon: 148.077, state: 'QLD' },
  'Mount Isa': { name: 'Mount Isa', code: 'ISA', lat: -20.664, lon: 139.489, state: 'QLD' },
  Newcastle: { name: 'Newcastle', code: 'NTL', lat: -32.795, lon: 151.834, state: 'NSW' },
  Newman: { name: 'Newman', code: 'ZNE', lat: -23.418, lon: 119.803, state: 'WA' },
  Perth: { name: 'Perth', code: 'PER', lat: -31.94, lon: 115.967, state: 'WA' },
  'Port Hedland': { name: 'Port Hedland', code: 'PHE', lat: -20.378, lon: 118.626, state: 'WA' },
  'Port Lincoln': { name: 'Port Lincoln', code: 'PLO', lat: -34.605, lon: 135.88, state: 'SA' },
  'Port Macquarie': { name: 'Port Macquarie', code: 'PQQ', lat: -31.436, lon: 152.863, state: 'NSW' },
  Proserpine: { name: 'Proserpine', code: 'PPP', lat: -20.495, lon: 148.552, state: 'QLD' },
  Rockhampton: { name: 'Rockhampton', code: 'ROK', lat: -23.382, lon: 150.475, state: 'QLD' },
  'Sunshine Coast': { name: 'Sunshine Coast', code: 'MCY', lat: -26.603, lon: 153.091, state: 'QLD' },
  Sydney: { name: 'Sydney', code: 'SYD', lat: -33.946, lon: 151.177, state: 'NSW' },
  Tamworth: { name: 'Tamworth', code: 'TMW', lat: -31.084, lon: 150.847, state: 'NSW' },
  Townsville: { name: 'Townsville', code: 'TSV', lat: -19.253, lon: 146.765, state: 'QLD' },
  'Wagga Wagga': { name: 'Wagga Wagga', code: 'WGA', lat: -35.165, lon: 147.466, state: 'NSW' },
};

export function airportCode(name: string): string {
  return AIRPORTS[name]?.code ?? name.slice(0, 3).toUpperCase();
}
