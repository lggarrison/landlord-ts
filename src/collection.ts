import type { Card } from './card/index.js';

export type Collection = {
  cards: Card[];
};

export function collectionFromCards(cards: Card[]): Collection {
  const sorted = [...cards].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
  return { cards: sorted };
}

export function cardFromName(collection: Collection, name: string): Card | undefined {
  const nameLower = name.toLowerCase();
  let lo = 0;
  let hi = collection.cards.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const probe = collection.cards[mid]!.name.toLowerCase();
    if (probe.localeCompare(nameLower) < 0) lo = mid + 1;
    else hi = mid;
  }
  const found = collection.cards[lo];
  if (found && found.name.toLowerCase() === nameLower) return found;
  return undefined;
}

export function otherFacesByName(collection: Collection, name: string): Card[] {
  const card = cardFromName(collection, name);
  if (!card || card.oracleId === '') return [];
  return collection.cards.filter((c) => c.oracleId === card.oracleId && c.name !== card.name);
}

/** Convenience object API matching Rust Collection methods. */
export type CollectionApi = Collection & {
  cardFromName(name: string): Card | undefined;
  otherFacesByName(name: string): Card[];
  readonly length: number;
};

export function asCollectionApi(collection: Collection): CollectionApi {
  return {
    ...collection,
    cardFromName: (name) => cardFromName(collection, name),
    otherFacesByName: (name) => otherFacesByName(collection, name),
    get length() {
      return collection.cards.length;
    },
  };
}
