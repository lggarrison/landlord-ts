import { afterEach, describe, expect, it } from 'vitest';
import {
  BasicLandType,
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
    basicLandTypes: partial.basicLandTypes ?? 0,
    checkTypes: partial.checkTypes ?? 0,
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

describe('deck M=auto and auto face-detect', () => {
  it('resolves DFC land face with M=auto', () => {
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

  it('auto-detects land face without M=auto', () => {
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
    const deck = deckFromList('1 Bala Ged Recovery');
    expect(deck.cards[0]!.card.kind).toBe(CardKind.ForcedLand);
    expect(deck.cards[0]!.card.manaCost.b).toBe(1);
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
      basicLandTypes: BasicLandType.Island,
    });
    const spell = makeCard({
      name: 'Negate',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 1),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 1, 0, 1)],
      manaCostString: '{1}{U}',
      turn: 2,
    });

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
      basicLandTypes: BasicLandType.Island,
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

describe('auto-tap board-aware lands', () => {
  const blueSpell = () =>
    makeCard({
      name: 'Opt',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
      turn: 1,
    });

  it('Check alone is tapped on turn 1', () => {
    const check = makeCard({
      name: 'Glacial Fortress',
      kind: CardKind.CheckLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 1, 0),
      basicLandTypes: BasicLandType.Plains | BasicLandType.Island,
      checkTypes: BasicLandType.Plains | BasicLandType.Island,
    });
    const spell = blueSpell();
    const hand = handFromOpeningAndDraws([check, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(false);
  });

  it('Check with matching basic before it is untapped on turn 1', () => {
    const island = makeCard({
      name: 'Island',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      basicLandTypes: BasicLandType.Island,
    });
    const check = makeCard({
      name: 'Glacial Fortress',
      kind: CardKind.CheckLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 1, 0),
      basicLandTypes: BasicLandType.Plains | BasicLandType.Island,
      checkTypes: BasicLandType.Plains | BasicLandType.Island,
    });
    const spell = blueSpell();
    // FIFO: Island playTurn 1, Check playTurn 2 — on T1 only Island is always-available;
    // Check isn't played yet. Use turn-2 spell to exercise unlocked check.
    spell.turn = 2;
    spell.manaCost = manaCostFromRgbuwc(0, 0, 0, 1, 0, 1);
    spell.allManaCosts = [spell.manaCost];
    const hand = handFromOpeningAndDraws([island, check, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
  });

  it('Shock dual unlocks Check', () => {
    const shock = makeCard({
      name: 'Hallowed Fountain',
      kind: CardKind.ShockLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 1, 0),
      basicLandTypes: BasicLandType.Plains | BasicLandType.Island,
    });
    const check = makeCard({
      name: 'Glacial Fortress',
      kind: CardKind.CheckLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 1, 0),
      checkTypes: BasicLandType.Plains | BasicLandType.Island,
    });
    const spell = makeCard({
      name: 'Negate',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 1),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 1, 0, 1)],
      turn: 2,
    });
    const hand = handFromOpeningAndDraws([shock, check, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
  });

  it('Fast as 4th land is tapped on its play turn', () => {
    const lands = [1, 2, 3].map((n) =>
      makeCard({
        name: `Island${n}`,
        kind: CardKind.BasicLand,
        manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
        basicLandTypes: BasicLandType.Island,
      }),
    );
    const fast = makeCard({
      name: 'Darkslick Shores',
      kind: CardKind.FastLand,
      manaCost: manaCostFromRgbuwc(0, 0, 1, 1, 0, 0),
    });
    const spell = makeCard({
      name: 'Doom Blade',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 1, 0, 0, 0),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
      turn: 4,
    });
    // Only the fast produces B; on turn 4 it is 4th land → tapped → available T5
    const hand = handFromOpeningAndDraws([...lands, fast, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(false);
    spell.turn = 5;
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
  });

  it('Slow as 3rd land is untapped', () => {
    const island1 = makeCard({
      name: 'Island1',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      basicLandTypes: BasicLandType.Island,
    });
    const island2 = makeCard({
      name: 'Island2',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      basicLandTypes: BasicLandType.Island,
    });
    const slow = makeCard({
      name: 'Deserted Beach',
      kind: CardKind.SlowLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 1, 0),
    });
    const spell = makeCard({
      name: 'Peace',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 0, 1, 0),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
      turn: 3,
    });
    const hand = handFromOpeningAndDraws([island1, island2, slow, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
  });

  it('BattleLand needs 2 basics, not just 2 lands', () => {
    const islandA = makeCard({
      name: 'Steam Vents',
      kind: CardKind.ShockLand,
      manaCost: manaCostFromRgbuwc(1, 0, 0, 1, 0, 0),
      basicLandTypes: BasicLandType.Island | BasicLandType.Mountain,
    });
    const islandB = makeCard({
      name: 'Breeding Pool',
      kind: CardKind.ShockLand,
      manaCost: manaCostFromRgbuwc(0, 1, 0, 1, 0, 0),
      basicLandTypes: BasicLandType.Forest | BasicLandType.Island,
    });
    const battle = makeCard({
      name: 'Prairie Stream',
      kind: CardKind.BattleLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 1, 0),
      basicLandTypes: BasicLandType.Island | BasicLandType.Plains,
    });
    const spell = makeCard({
      name: 'Peace',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 0, 1, 0),
      allManaCosts: [manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
      turn: 3,
    });
    // Two shocks are not Basic and produce no W → battle tapped on T3 → cannot pay W
    const hand = handFromOpeningAndDraws([islandA, islandB, battle, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(false);

    const island1 = makeCard({
      name: 'Island',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 1, 0, 0),
      basicLandTypes: BasicLandType.Island,
    });
    const plains = makeCard({
      name: 'Plains',
      kind: CardKind.BasicLand,
      manaCost: manaCostFromRgbuwc(0, 0, 0, 0, 1, 0),
      basicLandTypes: BasicLandType.Plains,
    });
    const unlocked = handFromOpeningAndDraws([island1, plains, battle, spell], []);
    expect(playCmcAutoTap(unlocked, spell).paid).toBe(true);
  });

  it('TurnLand untapped on turn 3 with empty board; tapped on turn 4', () => {
    const town = makeCard({
      name: 'Starting Town',
      kind: CardKind.TurnLand,
      manaCost: manaCostFromRgbuwc(1, 1, 1, 1, 1, 1),
    });
    const spell = makeCard({
      name: 'Bolt',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(1, 0, 0, 0, 0, 0),
      allManaCosts: [manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
      turn: 1,
    });
    const hand = handFromOpeningAndDraws([town, spell], []);
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
    spell.turn = 3;
    expect(playCmcAutoTap(hand, spell).paid).toBe(true);
    // On turn 4 the town is still the first land (playTurn 1) so still untapped.
    // Model a late play: put three basics first so town is playTurn 4.
    const basics = [1, 2, 3].map((n) =>
      makeCard({
        name: `Wastes${n}`,
        kind: CardKind.BasicLand,
        manaCost: manaCostFromRgbuwc(0, 0, 0, 0, 0, 1),
      }),
    );
    const late = makeCard({
      name: 'Late Town',
      kind: CardKind.TurnLand,
      manaCost: manaCostFromRgbuwc(1, 0, 0, 0, 0, 0),
    });
    const red = makeCard({
      name: 'Shock',
      kind: CardKind.Instant,
      manaCost: manaCostFromRgbuwc(1, 0, 0, 0, 0, 0),
      allManaCosts: [manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
      turn: 4,
    });
    const lateHand = handFromOpeningAndDraws([...basics, late, red], []);
    expect(playCmcAutoTap(lateHand, red).paid).toBe(false);
    red.turn = 5;
    expect(playCmcAutoTap(lateHand, red).paid).toBe(true);
  });
});
