// Downloads the latest BITRE Domestic Airline On Time Performance CSV.
// Source: https://data.gov.au/data/dataset/domestic-airline-on-time-performance
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_URL =
  'https://data.gov.au/data/dataset/29128ebd-dbaa-4ff5-8b86-d9f30de56452/resource/cf663ed1-0c5e-497f-aea9-e74bfda9cf44/download/otp_time_series_web.csv';
const OUT = join(__dirname, 'otp.csv');

async function main() {
  process.stdout.write(`Downloading ${CSV_URL}\n`);
  const res = await fetch(CSV_URL, { headers: { 'User-Agent': 'au-flights-pipeline/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching OTP CSV`);
  const text = await res.text();
  if (text.length < 1_000_000) throw new Error(`Suspiciously small CSV (${text.length} bytes)`);
  await writeFile(OUT, text, 'utf8');
  process.stdout.write(`Saved ${(text.length / 1e6).toFixed(1)} MB to ${OUT}\n`);
}

main().catch((err) => {
  process.stderr.write(`collect.mjs failed: ${err.message}\n`);
  process.exit(1);
});
