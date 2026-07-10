import { afterEach, describe, expect, it } from 'vitest';
import {
  CardKind,
  emptyCard,
  hashCardName,
  isLand,
  manaCostFromRgbuwc,
  type Card,
} from '../src/card/index.js';
import { asCollectionApi, collectionFromCards, otherFacesByName } from '../src/collection.js';
import { setAllCards } from '../src/data.js';
import { deckFromList } from '../src/deck.js';
import { handFromOpeningAndDraws, playCmcAutoTap, drawCmcAutoTap } from '../src/hand.js';

afterEach(() => {
  // Clear injected test DB so other files reload from disk
  setAllCards(null);
});

function makeCard(partial: Partial<Card> & { name: string }): Card {
  const manaCost = partial.manaCost ?? manaCostFromRgbuwc(0, 0, 0, 0, 0, 0);
  return {
    ...emptyCard(),
    hash: hashCardName(partial.name),
    turn: Math.max(1, manaCost.r + manaCost.g + manaCost.b + manaCost.u + manaCost.w + manaCost.c),
    manaCost,
    allManaCosts: partial.allManaCosts ?? [manaCost],
    ...partial,
  };
}

describe('collection otherFacesByName', () => {
  it('finds sibling DFC faces', () => {
    const spell = makeCard({
      name: 'Bala Ged Recovery',
      oracleId: 'oracle-1',
      kind: CardKind.Sorcery,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 0, 0, 2),
    });
    const land = makeCard({
      name: 'Bala Ged Sanctuary',
      oracleId: 'oracle-1',
      kind: CardKind.OtherLand,
      manaCost: manaCostFromRgbuwc(0, 0, 1, 0, 0, 0),
    });
    const unrelated = makeCard({
      name: 'Forest',
      oracleId: 'oracle-2',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 1, 0, 0, 0, 0),
    });
    const collection = collectionFromCards([land, spell, unrelated]);
    const faces = otherFacesByName(collection, 'Bala Ged Recovery');
    expect(faces).toHaveLength(1);
    expect(faces[0]!.name).toBe('Bala Ged Sanctuary');
  });
});

describe('deck M=auto', () => {
  it('resolves DFC land face', () => {
    const spell = makeCard({
      name: 'Bala Ged Recovery',
      oracleId: 'oracle-1',
      kind: CardKind.Sorcery,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 0, 0, 2),
      manaCostString: '{2}{G}',
    });
    const land = makeCard({
      name: 'Bala Ged Sanctuary',
      oracleId: 'oracle-1',
      kind: CardKind.OtherLand,
      manaCost: manaCostFromRgbuwc(0, 0, 1, 0, 0, 0),
      turn: 1,
    });
    setAllCards(asCollectionApi(collectionFromCards([spell, land])));
    const deck = deckFromList('1 Bala Ged Recovery M=auto');
    expect(deck.cards).toHaveLength(1);
    expect(deck.cards[0]!.card.kind).toBe(CardKind.ForcedLand);
    expect(deck.cards[0]!.card.manaCost.b).toBe(1);
    expect(isLand(deck.cards[0]!.card)).toBe(true);
  });
});

describe('auto-tap TapLand delay', () => {
  it('TapLand in opening is not available on turn 1', () => {
    const tapLand = makeCard({
      name: 'Guildgate',
      kind: CardKind.TapLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
    });
    const spell = makeCard({
      name: 'Opt',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      manaCostString: '{U}',
      turn: 1,
    });
    const hand = handFromOpeningAndDraws([tapLand, spell], []);
    const result = playCmcAutoTap(hand, spell);
    expect(result.cmc).toBe(false);
    expect(result.paid).toBe(false);
  });

  it('TapLand in opening is available on turn 2', () => {
    const tapLand = makeCard({
      name: 'Guildgate',
      kind: CardKind.TapLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
    });
    const island = makeCard({
      name: 'Island',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
    });
    const spell = makeCard({
      name: 'Negate',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
      manaCostString: '{1}{U}',
      turn: 2,
    });
    // Need 2 pips: {1}{U} — use colorless+U. Fix cost:
    spell.manaCost = manaCostFromRgbuwc(0, 0, 0, 1, 0, 1);
    spell.allManaCosts = [spell.manaCost];
    spell.turn = 2;

    const hand = handFromOpeningAndDraws([tapLand, island, spell], []);
    const result = playCmcAutoTap(hand, spell);
    expect(result.cmc).toBe(true);
    expect(result.paid).toBe(true);
  });

  it('basic land pays on turn 1', () => {
    const island = makeCard({
      name: 'Island',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
    });
    const spell = makeCard({
      name: 'Opt',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
      turn: 1,
    });
    const hand = handFromOpeningAndDraws([island, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
    expect(drawCmcAutoTap(hand, spell).paid).toBe(true);
  });
});
