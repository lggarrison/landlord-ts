import { gunzipSync } from "fflate";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Card } from "./card/index.js";
import {
  asCollectionApi,
  collectionFromCards,
  type CollectionApi,
} from "./collection.js";

function resolveDataPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../data/all_cards.json.gz"),
    join(process.cwd(), "data/all_cards.json.gz"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Cannot find data/all_cards.json.gz — run `npm run card-update` first",
  );
}

export function loadCardsFromGzipBytes(bytes: Uint8Array): CollectionApi {
  const jsonBytes = gunzipSync(bytes);
  const text = new TextDecoder().decode(jsonBytes);
  const cards = JSON.parse(text) as Card[];
  return asCollectionApi(collectionFromCards(cards));
}

export function loadCardsFromFile(path: string): CollectionApi {
  const buf = readFileSync(path);
  return loadCardsFromGzipBytes(new Uint8Array(buf));
}

let cached: CollectionApi | null = null;

/** Lazily loaded card collection (Node). */
export function getAllCards(): CollectionApi {
  if (!cached) {
    cached = loadCardsFromFile(resolveDataPath());
  }
  return cached;
}

/** Replace the in-memory collection (tests / custom DBs). Pass null to clear. */
export function setAllCards(collection: CollectionApi | null): void {
  cached = collection;
}

/**
 * Proxy so `ALL_CARDS.cardFromName(...)` works like Rust lazy_static.
 * Loads the gzipped DB on first property access.
 */
export const ALL_CARDS: CollectionApi = new Proxy({} as CollectionApi, {
  get(_target, prop, receiver) {
    const real = getAllCards();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
