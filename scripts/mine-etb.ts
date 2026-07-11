/**
 * Mine Scryfall oracle bulk data for unique land ETB ("enters tapped") clauses.
 *
 * Usage: npm run mine-etb
 */
import { gunzipSync } from 'fflate';
import { etbClauseFromOracle, landKindFromOracleText, type ScryfallCard } from '../src/scryfall.js';

const USER_AGENT = 'landlord-ts/0.1.0 (https://github.com/lggarrison/landlord-ts)';
const ACCEPT = 'application/json;q=0.9,*/*;q=0.8';

type BulkEntry = {
  type: string;
  download_uri?: string;
};

async function fetchOracleDownloadUri(): Promise<string> {
  const res = await fetch('https://api.scryfall.com/bulk-data', {
    headers: { 'User-Agent': USER_AGENT, Accept: ACCEPT },
  });
  if (!res.ok) throw new Error(`Scryfall bulk-data failed: ${res.status}`);
  const body = (await res.json()) as { data: BulkEntry[] };
  const uri = body.data.find((d) => d.type === 'oracle_cards')?.download_uri;
  if (!uri) throw new Error('Could not find oracle_cards download URI');
  return uri;
}

function decodeDownload(buf: Uint8Array): string {
  const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const bytes = isGzip ? gunzipSync(buf) : buf;
  return new TextDecoder().decode(bytes);
}

async function downloadCards(uri: string): Promise<ScryfallCard[]> {
  console.log(`Downloading ${uri}`);
  const res = await fetch(uri, { headers: { 'User-Agent': USER_AGENT, Accept: ACCEPT } });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const text = decodeDownload(new Uint8Array(await res.arrayBuffer())).trim();
  if (text.startsWith('[')) return JSON.parse(text) as ScryfallCard[];
  const cards: ScryfallCard[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    cards.push(JSON.parse(line) as ScryfallCard);
  }
  return cards;
}

type Cluster = { count: number; kind: string; examples: string[] };

async function main(): Promise<void> {
  const uri = await fetchOracleDownloadUri();
  await new Promise((r) => setTimeout(r, 100));
  const cards = await downloadCards(uri);
  const clusters = new Map<string, Cluster>();

  for (const card of cards) {
    const typeLine = card.type_line ?? '';
    if (!typeLine.includes('Land')) continue;
    const oracle = card.oracle_text ?? '';
    const clause = etbClauseFromOracle(oracle);
    if (!clause) continue;
    const kind = landKindFromOracleText(oracle, typeLine, card.name ?? '');
    const existing = clusters.get(clause);
    if (existing) {
      existing.count += 1;
      if (existing.examples.length < 3 && card.name) existing.examples.push(card.name);
    } else {
      clusters.set(clause, {
        count: 1,
        kind,
        examples: card.name ? [card.name] : [],
      });
    }
  }

  const sorted = [...clusters.entries()].sort((a, b) => b[1].count - a[1].count);
  console.log(`\n${sorted.length} unique ETB clauses across land cards:\n`);
  for (const [clause, info] of sorted) {
    console.log(`[${info.kind}] ×${info.count}`);
    console.log(`  ${clause}`);
    console.log(`  e.g. ${info.examples.join('; ')}`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
