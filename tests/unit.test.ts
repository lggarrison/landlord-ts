import { describe, expect, it } from 'vitest';
import { manaCostsFromStr, manaCostFromRgbuwc, CardKind } from '../src/card/index.js';
import { maximumBipartiteMatching } from '../src/bipartite.js';
import { landKindFromOracleText } from '../src/scryfall.js';

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
});

describe('bipartite matching', () => {
  it('matches a single pip to a single land', () => {
    // 1 pip, 1 land, edge present
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

  it('classifies tap lands', () => {
    expect(landKindFromOracleText('This land enters tapped.', 'Land')).toBe(CardKind.TapLand);
  });

  it('classifies basic lands', () => {
    expect(landKindFromOracleText('{T}: Add {G}.', 'Basic Land — Forest')).toBe(CardKind.BasicLand);
  });
});
