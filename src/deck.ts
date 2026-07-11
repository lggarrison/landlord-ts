import {
  CardKind,
  GameFormat,
  cloneCard,
  countManaColor,
  isLand,
  manaCostsFromStr,
  manaCostCmc,
  newManaColorCount,
  parseSetCode,
  type Card,
  type ManaColorCount,
  type SetCode,
} from './card/index.js';
import { ALL_CARDS } from './data.js';

export type DeckCard = {
  card: Card;
  count: number;
};

export type Deck = {
  title: string | null;
  url: string | null;
  cards: DeckCard[];
  format: GameFormat;
  cardCount: number;
};

export class DeckcodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckcodeError';
  }
}

export function newDeck(): Deck {
  return {
    title: null,
    url: null,
    cards: [],
    format: GameFormat.Standard,
    cardCount: 0,
  };
}

type DeckBuilder = Map<string, { card: Card; count: number }>;

function deckBuilderBuild(builder: DeckBuilder): Deck {
  const deck = newDeck();
  let count = 0;
  for (const { card, count: c } of builder.values()) {
    deck.cards.push({ card, count: c });
    count += c;
  }
  deck.cardCount = count;
  deck.cards.sort((a, b) => a.card.name.localeCompare(b.card.name));
  return deck;
}

function insertCount(builder: DeckBuilder, card: Card, count: number): void {
  const existing = builder.get(card.name);
  if (existing) existing.count += count;
  else builder.set(card.name, { card, count });
}

export function deckFromCards(cards: Iterable<Card>): Deck {
  const builder: DeckBuilder = new Map();
  for (const card of cards) insertCount(builder, card, 1);
  return deckBuilderBuild(builder);
}

export function deckFlatten(deck: Deck): Card[] {
  const result: Card[] = [];
  for (const cc of deck.cards) {
    for (let i = 0; i < cc.count; i++) result.push(cc.card);
  }
  return result;
}

export function deckLen(deck: Deck): number {
  return deck.cardCount;
}

export function deckIsEmpty(deck: Deck): boolean {
  return deck.cardCount === 0;
}

export function deckIter(deck: Deck): DeckCard[] {
  return deck.cards;
}

function stripInlineModifiersFromName(name: string): string {
  for (const sep of [' M=', ' m=', ' T=', ' t=', ' X=', ' x=']) {
    const idx = name.lastIndexOf(sep);
    if (idx !== -1) return name.slice(0, idx).trim();
  }
  return name.trim();
}

function applyLandFaceFromCard(card: Card, landFace: Card): void {
  card.manaCost = { ...landFace.manaCost };
  card.allManaCosts = landFace.allManaCosts.map((c) => ({ ...c }));
  card.manaCostString = landFace.manaCostString;
  card.turn = landFace.turn;
  card.kind = CardKind.ForcedLand;
  card.basicLandTypes = landFace.basicLandTypes ?? 0;
  card.checkTypes = landFace.checkTypes ?? 0;
}

function applyLandFace(card: Card, leftCardName: string, line: string): void {
  const landFace = ALL_CARDS.otherFacesByName(leftCardName).find((c) => isLand(c));
  if (!landFace) {
    throw new DeckcodeError(
      `M=auto specified but no land face found for "${leftCardName}" at line ${line}`,
    );
  }
  applyLandFaceFromCard(card, landFace);
}

const INLINE_M = /\sM\s*=\s*(auto|(?:\{[WUBRGC\d]+\})+)/i;
const INLINE_T = /\sT\s*=\s*(\d+)/i;
const INLINE_X = /\sX\s*=\s*(\d+)/i;

function inlineModifier(line: string, letter: 'M' | 'T' | 'X'): string | undefined {
  const re = letter === 'M' ? INLINE_M : letter === 'T' ? INLINE_T : INLINE_X;
  return line.match(re)?.[1];
}

const ARENA_LINE_REGEX =
  /^\s*(?<amount>\d+)\s+(?<name>[^#(\n\r]+)(?:\s*\((?<set>\w+)\)\s+(?<setnum>\d+))?\s*#?(?:\s*[Xx]\s*=\s*(?<X>\d+))?(?:\s*[Tt]\s*=\s*(?<T>\d+))?(?:\s*[Mm]\s*=\s*(?<M>auto|(?:\{[WUBRGC\d]+\})+))?/;

export function deckFromList(list: string): Deck {
  const builder: DeckBuilder = new Map();
  let lookingForDeckLine = false;

  for (const line of list.trim().split(/\r?\n/)) {
    const trimmed = line.trim();
    const trimmedLower = trimmed.toLowerCase();

    if (trimmedLower === 'deck') {
      lookingForDeckLine = false;
      continue;
    }
    if (trimmedLower === 'commander' || trimmedLower === 'companion' || trimmedLower === 'about') {
      lookingForDeckLine = true;
      continue;
    }
    if (trimmedLower === 'sideboard' || trimmedLower === 'maybeboard') break;
    if (trimmed.startsWith('#')) continue;
    if (lookingForDeckLine) continue;
    if (trimmed.length === 0) break;

    const caps = ARENA_LINE_REGEX.exec(trimmed);
    if (!caps?.groups) {
      throw new DeckcodeError(`Cannot regex capture deck list line: ${line}`);
    }

    const amount = Number.parseInt(caps.groups.amount!, 10);
    if (!Number.isFinite(amount)) {
      throw new DeckcodeError(`Cannot parse card amount from deck list line: ${line}`);
    }

    const name = stripInlineModifiersFromName(caps.groups.name!.trim());
    const set: SetCode = caps.groups.set ? parseSetCode(caps.groups.set) : '';
    const leftCardName = name.split('//')[0]?.trim();
    if (!leftCardName) {
      throw new DeckcodeError(`Cannot parse card name from deck list line: ${line}`);
    }

    const found = ALL_CARDS.cardFromName(leftCardName);
    if (!found) {
      throw new DeckcodeError(`Cannot find card named "${name}" in collection`);
    }
    const card = cloneCard(found);

    const xValStr = caps.groups.X ?? inlineModifier(trimmed, 'X');
    if (xValStr !== undefined && card.manaCostString.includes('X')) {
      const xVal = Number.parseInt(xValStr, 10);
      if (!Number.isFinite(xVal)) {
        throw new DeckcodeError(`Cannot parse X= value from deck list line: ${line}`);
      }
      card.manaCost = { ...card.manaCost, c: xVal };
      card.allManaCosts = card.allManaCosts.map((cost) => ({ ...cost, c: xVal }));
      card.manaCostString = card.manaCostString.replace(/X/g, String(xVal));
      card.turn = manaCostCmc(card.manaCost);
    }

    const mValStr = caps.groups.M ?? inlineModifier(trimmed, 'M');
    if (mValStr !== undefined) {
      if (mValStr.toLowerCase() === 'auto') {
        applyLandFace(card, leftCardName, line);
      } else {
        const allManaCosts = manaCostsFromStr(mValStr);
        if (allManaCosts.length === 0) {
          throw new DeckcodeError(`Problematic mana cost ('M = ') specified at line ${line}`);
        }
        card.manaCost = { ...allManaCosts[0]! };
        card.allManaCosts = allManaCosts.map((c) => ({ ...c }));
        card.turn = manaCostCmc(card.manaCost);
        card.kind = CardKind.ForcedLand;
        card.basicLandTypes = 0;
        card.checkTypes = 0;
      }
    } else if (!isLand(card)) {
      // Auto face-detect: spell//land DFCs become mana sources without M=auto
      const landFace = ALL_CARDS.otherFacesByName(leftCardName).find((c) => isLand(c));
      if (landFace) applyLandFaceFromCard(card, landFace);
    }

    const turnValStr = caps.groups.T ?? inlineModifier(trimmed, 'T');
    if (turnValStr !== undefined) {
      const turnVal = Number.parseInt(turnValStr, 10);
      if (!Number.isFinite(turnVal)) {
        throw new DeckcodeError(`Cannot parse T= value from deck list line: ${line}`);
      }
      card.turn += turnVal;
    }

    card.set = set;
    insertCount(builder, card, amount);
  }

  return deckBuilderBuild(builder);
}

export function decklist(list: string): Deck {
  return deckFromList(list);
}

export function deckManaCounts(deck: Deck): ManaColorCount {
  const mcc = newManaColorCount();
  for (const cc of deck.cards) {
    for (let i = 0; i < cc.count; i++) countManaColor(mcc, cc.card.manaCost);
  }
  return mcc;
}
