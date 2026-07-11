import { describe, expect, it } from 'vitest';
import { run, type CardObservationsReport } from '../src/index.js';

const THRESH = 0.025; // slightly wider than Rust's 0.015 — we use 25k runs vs 100k

function karstenCheck(
  cards: CardObservationsReport[],
  name: string,
  expected: number,
  thresh = THRESH,
): void {
  const o = cards.find((obs) => obs.name.toLowerCase() === name.toLowerCase());
  expect(o, `No card named: ${name}`).toBeTruthy();
  const actual = o!.p_mana_given_cmc;
  expect(Math.abs(expected - actual), `${name}: expected ${expected}, got ${actual}`).toBeLessThan(
    thresh,
  );
}

/** No blank lines — Deck.parse stops at the first empty line (Arena format). */
function karstenDeck(blackSources: number, colorlessLands: number, fillers: number): string {
  return `
1 Appetite for Brains
1 Abnormal Endurance
1 Bloodghast
1 Ammit Eternal
1 Blood Operative
1 Doomsday
1 Ancient Craving
1 Akuta, Born of Ash
1 Grave Pact
1 Anointed Deacon
1 Phyrexian Obliterator
1 Aku Djinn
1 Hellfire
1 Bogstomper
1 Acid-Spewer Dragon
1 Cosmic Horror
${blackSources} Swamp
${colorlessLands} Island M={C}
${fillers} Darksteel Colossus
`.trim();
}

describe('Karsten tables (seeded, reduced runs)', () => {
  // Full Rust suite uses 100k runs / ±0.015; 25k + ±0.025 is enough for CI.
  // Colorless fillers use M={C} (ForcedLand) so TapLand delay does not skew the
  // classic Karsten tables (Rust master treated Detection Tower as immediately available).
  const runs = 25_000;

  it('60 cards / 24 lands / 8 black sources', () => {
    const output = run({
      code: karstenDeck(8, 16, 20),
      runs,
      on_the_play: true,
      mulligan_down_to: 5,
      mulligan_on_lands: [0, 1, 6, 7],
      acceptable_hand_list: [],
      seed: 42,
    });
    expect(output.deck_size).toBe(60);
    const cards = output.cards;
    karstenCheck(cards, 'Appetite for Brains', 0.702);
    karstenCheck(cards, 'Abnormal Endurance', 0.756);
    karstenCheck(cards, 'Bloodghast', 0.322);
    karstenCheck(cards, 'Ammit Eternal', 0.822);
    karstenCheck(cards, 'Blood Operative', 0.415);
    karstenCheck(cards, 'Doomsday', 0.111);
    karstenCheck(cards, 'Ancient Craving', 0.881);
    karstenCheck(cards, 'Akuta, Born of Ash', 0.525);
    karstenCheck(cards, 'Grave Pact', 0.177);
    karstenCheck(cards, 'Anointed Deacon', 0.924);
    karstenCheck(cards, 'Aku Djinn', 0.635);
    karstenCheck(cards, 'Hellfire', 0.265);
    karstenCheck(cards, 'Acid-Spewer Dragon', 0.953);
    karstenCheck(cards, 'Bogstomper', 0.733);
    karstenCheck(cards, 'Cosmic Horror', 0.368);
  }, 120_000);

  it('60 cards / 24 lands / 14 black sources', () => {
    const output = run({
      code: karstenDeck(14, 10, 20),
      runs,
      on_the_play: true,
      mulligan_down_to: 5,
      mulligan_on_lands: [0, 1, 6, 7],
      acceptable_hand_list: [],
      seed: 42,
    });
    expect(output.deck_size).toBe(60);
    const cards = output.cards;
    karstenCheck(cards, 'Appetite for Brains', 0.914);
    karstenCheck(cards, 'Abnormal Endurance', 0.942);
    karstenCheck(cards, 'Bloodghast', 0.68);
    karstenCheck(cards, 'Ammit Eternal', 0.973);
    karstenCheck(cards, 'Blood Operative', 0.798);
    karstenCheck(cards, 'Doomsday', 0.44);
    karstenCheck(cards, 'Ancient Craving', 0.989);
    karstenCheck(cards, 'Akuta, Born of Ash', 0.892);
    karstenCheck(cards, 'Grave Pact', 0.609);
    karstenCheck(cards, 'Anointed Deacon', 0.996);
    karstenCheck(cards, 'Aku Djinn', 0.951);
    karstenCheck(cards, 'Hellfire', 0.761);
    karstenCheck(cards, 'Acid-Spewer Dragon', 0.999);
    karstenCheck(cards, 'Bogstomper', 0.981);
    karstenCheck(cards, 'Cosmic Horror', 0.875);
  }, 120_000);

  it('Hydroid Krasis X=23 always pays with enough lands', () => {
    const n = 1000;
    const output = run({
      // ForcedLand filler (not TapLand) so board-aware ETB delay cannot strand the 25th source
      code: `1 Hydroid Krasis X=23
12 Island
12 Forest
1 Wastes M={C}`,
      runs: n,
      on_the_play: false,
      mulligan_down_to: 7,
      mulligan_on_lands: [],
      acceptable_hand_list: [],
      seed: 7,
    });
    const card = output.cards[0]!;
    expect(card.played_on_curve).toBe(n);
    expect(card.not_enough_lands).toBe(0);
    expect(card.color_or_timing_fail).toBe(0);
    expect(card.mana_ok_undrawn).toBe(0);
  });
});
