import { describe, expect, it } from 'vitest';
import {
  manaCostsFromStr,
  manaCostFromRgbuwc,
  CardKind,
  BasicLandType,
  basicLandTypesFromTypeLine,
  checkTypesFromOracleText,
} from '../src/card/index.js';
import { maximumBipartiteMatching } from '../src/bipartite.js';
import { landKindFromOracleText } from '../src/scryfall.js';
import { availableTurnForLand, type SimCard } from '../src/hand.js';
import { wilsonHalfWidth } from '../src/simulation.js';
import { emptyManaCost } from '../src/card/mana-cost.js';

describe('manaCostsFromStr', () => {
  it('parses empty string', () => {
    const res = manaCostsFromStr('');
    expect(res).toHaveLength(1);
    expect(res[0]).toEqual(manaCostFromRgbuwc(0, 0, 0, 0, 0, 0));
  });

  it('parses {1}{U}', () => {
    const res = manaCostsFromStr('{1}{U}');
    expect(res).toHaveLength(1);
    expect(res[0]!.c).toBe(1);
    expect(res[0]!.u).toBe(1);
  });

  it('parses {X}{U} as colorless 1', () => {
    const res = manaCostsFromStr('{X}{U}');
    expect(res).toHaveLength(1);
    expect(res[0]!.c).toBe(1);
    expect(res[0]!.u).toBe(1);
  });

  it('expands hybrid {B/R}', () => {
    const res = manaCostsFromStr('{B/R}');
    expect(res).toHaveLength(2);
    expect(res.some((c) => c.r === 1 && c.b === 0)).toBe(true);
    expect(res.some((c) => c.b === 1 && c.r === 0)).toBe(true);
  });

  it('expands hybrid + generic {1}{U/B} without collapsing', () => {
    const res = manaCostsFromStr('{1}{U/B}');
    expect(res).toHaveLength(2);
    expect(res.some((c) => c.c === 1 && c.u === 1 && c.b === 0)).toBe(true);
    expect(res.some((c) => c.c === 1 && c.b === 1 && c.u === 0)).toBe(true);
  });
});

describe('bipartite matching', () => {
  it('matches a single pip to a single land', () => {
    const edges = [1];
    const seen = [false];
    const matches = [-1];
    expect(maximumBipartiteMatching(edges, 1, 1, seen, matches)).toBe(1);
  });

  it('fails when no edges', () => {
    const edges = [0];
    const seen = [false];
    const matches = [-1];
    expect(maximumBipartiteMatching(edges, 1, 1, seen, matches)).toBe(0);
  });
});

describe('landKindFromOracleText', () => {
  it('classifies shock lands', () => {
    expect(
      landKindFromOracleText(
        "As this land enters, you may pay 2 life. If you don't, it enters tapped.",
        'Land — Island Mountain',
      ),
    ).toBe(CardKind.ShockLand);
  });

  it('classifies check lands', () => {
    expect(
      landKindFromOracleText(
        'This land enters tapped unless you control a Plains or an Island.',
        'Land — Plains Island',
      ),
    ).toBe(CardKind.CheckLand);
  });

  it('classifies fast lands', () => {
    expect(
      landKindFromOracleText(
        'This land enters tapped unless you control two or fewer other lands.',
        'Land — Island Swamp',
      ),
    ).toBe(CardKind.FastLand);
  });

  it('classifies slow lands', () => {
    expect(
      landKindFromOracleText(
        'This land enters tapped unless you control two or more other lands.',
        'Land — Forest Island',
      ),
    ).toBe(CardKind.SlowLand);
  });

  it('classifies battle lands (tangolands)', () => {
    expect(
      landKindFromOracleText(
        'This land enters tapped unless you control two or more basic lands.',
        'Land — Island Plains',
      ),
    ).toBe(CardKind.BattleLand);
  });

  it('classifies turn lands (Starting Town)', () => {
    expect(
      landKindFromOracleText(
        "This land enters tapped unless it's your first, second, or third turn of the game.",
        'Land — Town',
      ),
    ).toBe(CardKind.TurnLand);
  });

  it('classifies bounce lands', () => {
    expect(
      landKindFromOracleText(
        "This land enters tapped. When this land enters, return a land you control to its owner's hand.",
        'Land',
      ),
    ).toBe(CardKind.BounceLand);
  });

  it('classifies surveil lands', () => {
    expect(
      landKindFromOracleText(
        'This land enters tapped. When this land enters, surveil 1.',
        'Land — Island Swamp',
      ),
    ).toBe(CardKind.SurveilLand);
  });

  it('classifies triomes', () => {
    expect(
      landKindFromOracleText(
        'This land enters tapped. {T}: Add {B}, {G}, or {U}. Cycling {3}',
        'Land — Swamp Forest Island',
      ),
    ).toBe(CardKind.TriomeLand);
  });

  it('classifies cycling taplands', () => {
    expect(
      landKindFromOracleText('This land enters tapped. {T}: Add {G}. Cycling {G}', 'Land'),
    ).toBe(CardKind.CyclingLand);
  });

  it('classifies tap lands', () => {
    expect(landKindFromOracleText('This land enters tapped.', 'Land')).toBe(CardKind.TapLand);
  });

  it('classifies fetch lands', () => {
    expect(
      landKindFromOracleText(
        '{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Mountain card, put it onto the battlefield, then shuffle.',
        'Land',
        'Scalding Tarn',
      ),
    ).toBe(CardKind.FetchLand);
  });

  it('classifies pain lands', () => {
    expect(
      landKindFromOracleText(
        '{T}: Add {C}. {T}: Add {W} or {U}. This land deals 1 damage to you.',
        'Land',
      ),
    ).toBe(CardKind.PainLand);
  });

  it('classifies canopy lands', () => {
    expect(
      landKindFromOracleText(
        '{T}: Add {G} or {W}. This land deals 1 damage to you. {1}, Pay 1 life, Sacrifice this land: Draw a card.',
        'Land',
      ),
    ).toBe(CardKind.CanopyLand);
  });

  it('classifies pathway lands by name', () => {
    expect(landKindFromOracleText('{T}: Add {U}.', 'Land', 'Clearwater Pathway')).toBe(
      CardKind.PathwayLand,
    );
  });

  it('classifies basic lands', () => {
    expect(landKindFromOracleText('{T}: Add {G}.', 'Basic Land — Forest')).toBe(CardKind.BasicLand);
  });
});

describe('basic land type parsing', () => {
  it('parses dual type lines', () => {
    expect(basicLandTypesFromTypeLine('Land — Island Mountain')).toBe(
      BasicLandType.Island | BasicLandType.Mountain,
    );
  });

  it('parses check requirements from oracle', () => {
    expect(
      checkTypesFromOracleText('This land enters tapped unless you control a Plains or an Island.'),
    ).toBe(BasicLandType.Plains | BasicLandType.Island);
  });
});

describe('availableTurnForLand', () => {
  function sim(kind: CardKind, checkTypes = 0, basicLandTypes = 0): SimCard {
    return {
      hash: 1,
      kind,
      manaCost: emptyManaCost(),
      basicLandTypes,
      checkTypes,
    };
  }

  it('TapLand always delays one turn', () => {
    expect(availableTurnForLand(sim(CardKind.TapLand), 1, 0, 0, 0)).toBe(2);
  });

  it('CheckLand untapped when board has required type', () => {
    const check = sim(CardKind.CheckLand, BasicLandType.Island);
    expect(availableTurnForLand(check, 1, 0, BasicLandType.Island, 0)).toBe(1);
    expect(availableTurnForLand(check, 1, 0, 0, 0)).toBe(2);
  });

  it('FastLand untapped as 1st–3rd land', () => {
    const fast = sim(CardKind.FastLand);
    expect(availableTurnForLand(fast, 1, 0, 0, 0)).toBe(1);
    expect(availableTurnForLand(fast, 3, 2, 0, 0)).toBe(3);
    expect(availableTurnForLand(fast, 4, 3, 0, 0)).toBe(5);
  });

  it('SlowLand untapped as 3rd+ land', () => {
    const slow = sim(CardKind.SlowLand);
    expect(availableTurnForLand(slow, 1, 0, 0, 0)).toBe(2);
    expect(availableTurnForLand(slow, 2, 1, 0, 0)).toBe(3);
    expect(availableTurnForLand(slow, 3, 2, 0, 0)).toBe(3);
  });

  it('BattleLand untapped with 2+ basics on board', () => {
    const battle = sim(CardKind.BattleLand);
    expect(availableTurnForLand(battle, 3, 2, 0, 1)).toBe(4);
    expect(availableTurnForLand(battle, 3, 2, 0, 2)).toBe(3);
  });

  it('TurnLand untapped on turns 1–3', () => {
    const turn = sim(CardKind.TurnLand);
    expect(availableTurnForLand(turn, 1, 0, 0, 0)).toBe(1);
    expect(availableTurnForLand(turn, 3, 0, 0, 0)).toBe(3);
    expect(availableTurnForLand(turn, 4, 0, 0, 0)).toBe(5);
  });
});

describe('wilsonHalfWidth', () => {
  it('shrinks with more trials', () => {
    expect(wilsonHalfWidth(50, 100)).toBeGreaterThan(wilsonHalfWidth(500, 1000));
  });
});
