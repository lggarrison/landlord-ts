import { describe, expect, it } from 'vitest';
import { ALL_CARDS, DeckcodeError, parseDecklist, run, RunValidationError } from '../src/index.js';
import { deckFromList } from '../src/deck.js';

/** Verbatim MTG Arena export (includes blank line before Sideboard). */
const mtgArenaDeck = `
Deck
9 Forest (FDN) 291
3 Mountain (FDN) 289
4 Llanowar Elves (M19) 314
2 Pelakka Wurm (M19) 192
2 Darksteel Colossus (FDN) 671
4 Stomping Ground (EOE) 258
2 Bushwhack (FDN) 215
1 Trumpeting Carnosaur (LCI) 171
2 Ghalta, Stampede Tyrant (LCI) 185
2 Vaultborn Tyrant (BIG) 20
4 Overlord of the Hauntwoods (DSK) 194
4 Esper Origins (FIN) 185
4 Earthbender Ascension (TLA) 175
4 Shared Roots (TLA) 196
4 Multiversal Passage (SPM) 180
3 Raph & Mikey, Troublemakers (TMT) 167
4 World War Hulk (MSH) 197
2 Training Compound (MSH) 275

Sideboard
1 Vivien Reid (FDN) 234
1 Soul-Guide Lantern (THB) 237
3 Pick Your Poison (MKM) 170
1 Balustrade Wurm (DSK) 168
2 Ghost Vacuum (DSK) 248
2 Redirect Lightning (TLA) 151
2 Hexing Squelcher (ECL) 145
2 Sear (ECL) 154
`;

/** Verbatim Moxfield export (About header + Sideboard). */
const moxFieldDeck = `About
Name Big Red Thor

Deck
1 Abrade
3 Avengers Disassembled
4 Burst Lightning
2 Clive, Ifrit's Dominant
3 Death to Our Enemies
3 Demolition Field
3 Improvisation Capstone
1 Mjölnir, Hammer of Thor
18 Mountain
3 Overlord of the Boilerbilges
3 Petrified Hamlet
2 Sear
2 Solemn Simulacrum
4 Tablet of Discovery
2 The Irencrag
1 The Vision
2 Thor, God of Thunder
3 Ugin, Eye of the Storms

Sideboard
2 Ghost Vacuum
2 Impractical Joke
4 Price of Freedom
2 Return the Favor
3 Sunspine Lynx
2 The Legend of Roku
`;

/** Verbatim AetherHub export. */
const aetherHubDeck = `
Deck
3 Island
3 Hallowed Fountain
4 Steam Vents
3 Spirebluff Canal
2 Sundown Pass
2 Stock Up
3 Riverpyre Verge
4 Jeskai Revelation
4 Accumulate Wisdom
4 Gran-Gran
3 It'll Quench Ya!
3 Combustion Technique
3 Firebending Lesson
2 Iroh's Demonstration
3 Abandon Attachments
3 Death to Our Enemies
4 Tablet of Discovery
4 Great Hall of the Biblioplex
1 Improvisation Capstone
2 Thor, God of Thunder
`;

const malformedMtgArenaDeck = `
Deck
9 My Weird Card That Does Not Exist (FDN) 291
3 Mountain (FDN) 289
4 Llanowar Elves (M19) 314
2 Pelakka Wurm (M19) 192
2 Darksteel Colossus (FDN) 671
4 Stomping Ground (EOE) 258
2 Bushwhack (FDN) 215
1 Trumpeting Carnosaur (LCI) 171
2 Ghalta, Stampede Tyrant (LCI) 185
2 Vaultborn Tyrant (BIG) 20
4 Overlord of the Hauntwoods (DSK) 194
4 Esper Origins (FIN) 185
4 Earthbender Ascension (TLA) 175
4 Shared Roots (TLA) 196
4 Multiversal Passage (SPM) 180
3 Raph & Mikey, Troublemakers (TMT) 167
4 World War Hulk (MSH) 197
2 Training Compound (MSH) 275

Sideboard
1 Vivien Reid (FDN) 234
1 Soul-Guide Lantern (THB) 237
3 Pick Your Poison (MKM) 170
1 Balustrade Wurm (DSK) 168
2 Ghost Vacuum (DSK) 248
2 Redirect Lightning (TLA) 151
2 Hexing Squelcher (ECL) 145
2 Sear (ECL) 154
`;

const multipleMalformedMtgArenaDeck = `
Deck
9 My Weird Card That Does Not Exist (FDN) 291
3 My Other Weird Card That Does Not Exist (FDN) 289
4 Llanowar Elves (M19) 314
2 Pelakka Wurm (M19) 192
2 Darksteel Colossus (FDN) 671
4 Stomping Ground (EOE) 258
2 Bushwhack (FDN) 215
1 Trumpeting Carnosaur (LCI) 171
2 Ghalta, Stampede Tyrant (LCI) 185
2 Vaultborn Tyrant (BIG) 20
4 Overlord of the Hauntwoods (DSK) 194
4 Esper Origins (FIN) 185
4 Earthbender Ascension (TLA) 175
4 Shared Roots (TLA) 196
4 Multiversal Passage (SPM) 180
3 Raph & Mikey, Troublemakers (TMT) 167
4 World War Hulk (MSH) 197
2 Training Compound (MSH) 275

Sideboard
1 Vivien Reid (FDN) 234
1 Soul-Guide Lantern (THB) 237
3 Pick Your Poison (MKM) 170
1 Balustrade Wurm (DSK) 168
2 Ghost Vacuum (DSK) 248
2 Redirect Lightning (TLA) 151
2 Hexing Squelcher (ECL) 145
2 Sear (ECL) 154
`;

const runDefaults = {
  onThePlay: true,
  mulliganDownTo: 5,
  mulliganOnLands: [0, 1, 6, 7] as number[],
  acceptableHandList: [] as string[][],
  runs: 200,
  seed: 42,
};

function countOf(deck: ReturnType<typeof deckFromList>, name: string): number {
  return deck.cards.find((c) => c.card.name === name)?.count ?? 0;
}

describe('cardFromName localeCompare lookup', () => {
  it('finds names that fail under code-unit < ordering', () => {
    expect(ALL_CARDS.cardFromName('Ugin, Eye of the Storms')?.name).toBe('Ugin, Eye of the Storms');
    expect(ALL_CARDS.cardFromName('Sear')?.name).toBe('Sear');
  });
});

describe('Arena set / collector codes', () => {
  it('strips (SET) collector number before name lookup', () => {
    const deck = deckFromList('9 Forest (FDN) 291\n3 Mountain (FDN) 289\n');
    expect(deck.cardCount).toBe(12);
    expect(countOf(deck, 'Forest')).toBe(9);
    expect(countOf(deck, 'Mountain')).toBe(3);
  });
});

describe('parseDecklist', () => {
  it('accepts a valid Arena export', () => {
    const result = parseDecklist(mtgArenaDeck);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck.cardCount).toBe(60);
  });

  it('reports unknown card name for UI (does not throw)', () => {
    const result = parseDecklist(malformedMtgArenaDeck);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('My Weird Card That Does Not Exist');
    expect(result.error.unknownCardName).toBe('My Weird Card That Does Not Exist');
    expect(result.error.unknownCardNames).toEqual(['My Weird Card That Does Not Exist']);
  });

  it('reports all unknown card names in one pass', () => {
    const result = parseDecklist(multipleMalformedMtgArenaDeck);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.unknownCardNames).toEqual([
      'My Weird Card That Does Not Exist',
      'My Other Weird Card That Does Not Exist',
    ]);
    expect(result.error.unknownCardName).toBe('My Weird Card That Does Not Exist');
    expect(result.error.message).toContain('My Weird Card That Does Not Exist');
    expect(result.error.message).toContain('My Other Weird Card That Does Not Exist');
  });

  it('rejects empty input', () => {
    const result = parseDecklist('');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Empty deckcode');
  });
});

describe('run() with malformed decks', () => {
  it('throws RunValidationError with unknownCardNames on cause (single)', () => {
    try {
      run({ ...runDefaults, code: malformedMtgArenaDeck });
      expect.unreachable('expected run() to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(RunValidationError);
      expect((e as RunValidationError).message).toMatch(/Bad deckcode/);
      expect((e as RunValidationError).cause).toBeInstanceOf(DeckcodeError);
      const cause = (e as RunValidationError).cause as DeckcodeError;
      expect(cause.unknownCardNames).toEqual(['My Weird Card That Does Not Exist']);
      expect(cause.unknownCardName).toBe('My Weird Card That Does Not Exist');
    }
  });

  it('throws RunValidationError with all unknownCardNames on cause (multiple)', () => {
    try {
      run({ ...runDefaults, code: multipleMalformedMtgArenaDeck });
      expect.unreachable('expected run() to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(RunValidationError);
      expect((e as RunValidationError).message).toMatch(/Bad deckcode/);
      expect((e as RunValidationError).cause).toBeInstanceOf(DeckcodeError);
      const cause = (e as RunValidationError).cause as DeckcodeError;
      expect(cause.unknownCardNames).toEqual([
        'My Weird Card That Does Not Exist',
        'My Other Weird Card That Does Not Exist',
      ]);
    }
  });
});

describe('real exported decks', () => {
  it('parses MTG Arena export: maindeck only, set codes ignored', () => {
    const deck = deckFromList(mtgArenaDeck);
    expect(deck.cardCount).toBe(60);
    expect(countOf(deck, 'Forest')).toBe(9);
    expect(countOf(deck, 'Llanowar Elves')).toBe(4);
    expect(countOf(deck, 'Vivien Reid')).toBe(0);
    expect(countOf(deck, 'Sear')).toBe(0);
    expect(countOf(deck, 'Ghost Vacuum')).toBe(0);
  });

  it('simulates MTG Arena export via run()', () => {
    const output = run({ ...runDefaults, code: mtgArenaDeck });
    expect(output.deckSize).toBe(60);
    expect(output.totalSimulations).toBe(200);
    expect(output.cards.length).toBeGreaterThan(0);
    const elves = output.cards.find((c) => c.name === 'Llanowar Elves');
    expect(elves).toBeTruthy();
    expect(elves!.copies).toBe(4);
    expect(elves!.totalSimulations).toBe(200);
  });

  it('parses Moxfield export: skips About, drops sideboard', () => {
    const deck = deckFromList(moxFieldDeck);
    expect(deck.cardCount).toBe(60);
    expect(countOf(deck, 'Mountain')).toBe(18);
    expect(countOf(deck, 'Ugin, Eye of the Storms')).toBe(3);
    expect(countOf(deck, 'Sear')).toBe(2);
    expect(countOf(deck, 'Ghost Vacuum')).toBe(0);
    expect(countOf(deck, 'Sunspine Lynx')).toBe(0);
  });

  it('simulates Moxfield export via run()', () => {
    const output = run({ ...runDefaults, code: moxFieldDeck });
    expect(output.deckSize).toBe(60);
    expect(output.totalSimulations).toBe(200);
    expect(output.cards.length).toBeGreaterThan(0);
    const ugin = output.cards.find((c) => c.name === 'Ugin, Eye of the Storms');
    expect(ugin).toBeTruthy();
    expect(ugin!.copies).toBe(3);
  });

  it('parses and simulates AetherHub export', () => {
    const deck = deckFromList(aetherHubDeck);
    expect(deck.cardCount).toBe(60);
    expect(countOf(deck, 'Island')).toBe(3);
    expect(countOf(deck, "It'll Quench Ya!")).toBe(3);
    expect(countOf(deck, 'Thor, God of Thunder')).toBe(2);

    const output = run({ ...runDefaults, code: aetherHubDeck });
    expect(output.deckSize).toBe(60);
    expect(output.totalSimulations).toBe(200);
    expect(output.cards.length).toBeGreaterThan(0);
  });
});
