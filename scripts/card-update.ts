/**
 * Fetch Scryfall oracle-cards JSONL bulk data and write data/all_cards.json.gz
 *
 * Usage: npm run card-update
 */
import { gunzipSync, gzipSync } from 'fflate';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryfallCardsToCards, type ScryfallCard } from '../src/scryfall.js';

const USER_AGENT = 'landlord-ts/0.1.0 (https://github.com/lggarrison/landlord-ts)';
const ACCEPT = 'application/json;q=0.9,*/*;q=0.8';

type BulkEntry = {
  type: string;
  download_uri?: string;
};

async function fetchOracleDownloadUri(): Promise<string> {
  const res = await fetch('https://api.scryfall.com/bulk-data', {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: ACCEPT,
    },
  });
  if (!res.ok) {
    throw new Error(`Scryfall bulk-data failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { data: BulkEntry[] };
  const oracle = body.data.find((d) => d.type === 'oracle_cards');
  const uri = oracle?.download_uri;
  if (!uri) {
    throw new Error('Could not find oracle_cards download URI in Scryfall bulk-data');
  }
  return uri;
}

function decodeDownload(buf: Uint8Array): string {
  const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const bytes = isGzip ? gunzipSync(buf) : buf;
  return new TextDecoder().decode(bytes);
}

async function downloadCards(uri: string): Promise<ScryfallCard[]> {
  console.log(`Downloading ${uri}`);
  const res = await fetch(uri, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: ACCEPT,
    },
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const ab = await res.arrayBuffer();
  const text = decodeDownload(new Uint8Array(ab)).trim();
  if (text.startsWith('[')) {
    return JSON.parse(text) as ScryfallCard[];
  }
  const cards: ScryfallCard[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    cards.push(JSON.parse(line) as ScryfallCard);
  }
  return cards;
}

async function main(): Promise<void> {
  const uri = await fetchOracleDownloadUri();
  await new Promise((r) => setTimeout(r, 100));
  const scryfallCards = await downloadCards(uri);
  console.log(`Parsed ${scryfallCards.length} Scryfall cards`);
  const cards = scryfallCardsToCards(scryfallCards);
  console.log(`Converted ${cards.length} landlord cards (with faces)`);

  const json = new TextEncoder().encode(JSON.stringify(cards));
  const gz = gzipSync(json, { level: 9 });

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const outPath = join(root, 'data', 'all_cards.json.gz');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, gz);
  console.log(`Wrote ${outPath} (${gz.byteLength} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
