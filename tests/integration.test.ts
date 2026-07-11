import { describe, expect, it } from 'vitest';
import { ALL_CARDS, pManaGivenCmc, run, runAsync, type RunProgress } from '../src/index.js';
import { deckFromList } from '../src/deck.js';
import { asNeverMulligan } from '../src/mulligan/index.js';
import {
  observationsForCard,
  simulationFromConfig,
  simulationFromConfigAdaptive,
  simulationFromConfigAsync,
} from '../src/simulation.js';

const tinyGreen = {
  code: `
1 Llanowar Elves
6 Forest
`,
  on_the_play: true,
  mulligan_down_to: 7,
  mulligan_on_lands: [] as number[],
  acceptable_hand_list: [] as string[][],
};

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

describe('card database', () => {
  it('loads Forest and Opt', () => {
    expect(ALL_CARDS.cardFromName('Forest')).toBeTruthy();
    expect(ALL_CARDS.cardFromName('Opt')).toBeTruthy();
    expect(ALL_CARDS.cardFromName('Steam Vents')).toBeTruthy();
  });
});

describe('run() façade', () => {
  it('simulates a tiny green deck', () => {
    const output = run({
      ...tinyGreen,
      runs: 200,
      seed: 42,
    });
    expect(output.deck_size).toBe(7);
    expect(output.total_simulations).toBe(200);
    expect(output.cards.length).toBeGreaterThan(0);
    const elves = output.cards.find((o) => o.name === 'Llanowar Elves');
    expect(elves).toBeTruthy();
    expect(elves!.total_simulations).toBe(200);
    expect(elves!.p_mana_given_cmc).toBeGreaterThan(0.9);
  });

  it('includes per-card success/miss invariants', () => {
    const runs = 200;
    const output = run({
      ...tinyGreen,
      runs,
      seed: 42,
    });
    expect(output.total_simulations).toBe(runs);
    expect(output.deck_size).toBe(7);
    expect(output.weakest_on_curve.length).toBe(output.cards.length);

    for (const card of output.cards) {
      expect(card.played_on_curve + card.not_played_on_curve).toBe(card.total_simulations);
      expect(
        card.not_enough_lands +
          card.color_or_timing_fail +
          card.mana_ok_undrawn +
          card.played_on_curve,
      ).toBe(card.total_simulations);
    }

    const elves = output.cards.find((c) => c.name === 'Llanowar Elves');
    expect(elves).toBeTruthy();
    expect(elves!.total_simulations).toBe(runs);
    expect(elves!.p_cast_on_curve).toBe(elves!.played_on_curve / elves!.total_simulations);
  });

  it('rejects runCount <= 0', () => {
    expect(() =>
      run({
        ...tinyGreen,
        runs: 0,
        seed: 1,
      }),
    ).toThrow('runCount must be > 0');
  });
});

describe('runAsync() façade', () => {
  it('matches seeded run() with parallel off', async () => {
    const input = {
      ...tinyGreen,
      runs: 200,
      seed: 42,
      parallel: false as const,
    };
    const syncOut = run(input);
    const asyncOut = await runAsync({ ...input, batch_size: 50 });
    expect(asyncOut).toEqual(syncOut);
  });

  it('matches seeded run() without on_progress', async () => {
    const input = {
      ...tinyGreen,
      runs: 120,
      seed: 11,
      parallel: false as const,
    };
    const syncOut = run(input);
    const asyncOut = await runAsync({ ...input, batch_size: 40 });
    expect(asyncOut).toEqual(syncOut);
  });

  it('matches seeded run() when epsilon early-stops', async () => {
    const input = {
      ...tinyGreen,
      runs: 5000,
      seed: 99,
      parallel: false as const,
      epsilon: 0.05,
    };
    const syncOut = run(input);
    const ticks: RunProgress[] = [];
    const asyncOut = await runAsync({
      ...input,
      batch_size: 50, // ignored under epsilon; must still match sync adaptive
      on_progress: (p) => ticks.push({ ...p }),
    });
    expect(asyncOut).toEqual(syncOut);
    const elves = asyncOut.cards.find((o) => o.name === 'Llanowar Elves');
    expect(elves).toBeTruthy();
    expect(elves!.total_simulations).toBeLessThan(input.runs);
    expect(ticks.at(-1)!.completed).toBe(elves!.total_simulations);
    expect(ticks.at(-1)!.completed).toBeLessThan(ticks.at(-1)!.total);
  });

  it('reports monotonic on_progress up to total runs', async () => {
    const ticks: RunProgress[] = [];
    const runs = 120;
    const output = await runAsync({
      ...tinyGreen,
      runs,
      seed: 7,
      batch_size: 40,
      on_progress: (p) => ticks.push({ ...p }),
    });
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]!.total).toBe(runs);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.completed).toBeGreaterThan(ticks[i - 1]!.completed);
      expect(ticks[i]!.total).toBe(runs);
    }
    expect(ticks.at(-1)!.completed).toBe(runs);
    const elves = output.cards.find((o) => o.name === 'Llanowar Elves');
    expect(elves!.total_simulations).toBe(runs);
  });

  it('emits one progress tick per batch_size chunk', async () => {
    const ticks: RunProgress[] = [];
    await runAsync({
      ...tinyGreen,
      runs: 100,
      seed: 5,
      batch_size: 40,
      on_progress: (p) => ticks.push({ ...p }),
    });
    expect(ticks.map((t) => t.completed)).toEqual([40, 80, 100]);
    expect(ticks.every((t) => t.total === 100)).toBe(true);
  });

  it('rejects when on_progress throws', async () => {
    await expect(
      runAsync({
        ...tinyGreen,
        runs: 80,
        seed: 1,
        batch_size: 20,
        on_progress: () => {
          throw new Error('progress boom');
        },
      }),
    ).rejects.toThrow('progress boom');
  });

  it('rejects when signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const ticks: RunProgress[] = [];
    await expect(
      runAsync({
        ...tinyGreen,
        runs: 80,
        seed: 2,
        batch_size: 20,
        signal: ac.signal,
        on_progress: (p) => ticks.push({ ...p }),
      }),
    ).rejects.toSatisfy(isAbortError);
    expect(ticks).toEqual([]);
  });

  it('rejects when signal is aborted between batches', async () => {
    const ac = new AbortController();
    await expect(
      runAsync({
        ...tinyGreen,
        runs: 200,
        seed: 3,
        batch_size: 40,
        signal: ac.signal,
        on_progress: () => {
          ac.abort();
        },
      }),
    ).rejects.toSatisfy(isAbortError);
  });

  it('rejects when signal aborts after the progress yield', async () => {
    const ac = new AbortController();
    let ticks = 0;
    await expect(
      runAsync({
        ...tinyGreen,
        runs: 120,
        seed: 4,
        batch_size: 40,
        signal: ac.signal,
        on_progress: () => {
          ticks += 1;
          if (ticks === 1) {
            setTimeout(() => ac.abort(), 0);
          }
        },
      }),
    ).rejects.toSatisfy(isAbortError);
    expect(ticks).toBeGreaterThanOrEqual(1);
  });

  it('rejects runCount <= 0', async () => {
    await expect(
      runAsync({
        ...tinyGreen,
        runs: 0,
        seed: 1,
      }),
    ).rejects.toThrow('runCount must be > 0');
  });

  it('rejects the same invalid inputs as run()', async () => {
    const badDeck = { ...tinyGreen, code: 'not a decklist!!!', runs: 10, seed: 1 };
    const emptyDeck = { ...tinyGreen, code: '', runs: 10, seed: 1 };
    const badHand = {
      ...tinyGreen,
      runs: 10,
      seed: 1,
      acceptable_hand_list: [['Not A Real Card Name XYZ']],
    };

    expect(() => run(badDeck)).toThrow(/Bad deckcode/);
    await expect(runAsync(badDeck)).rejects.toThrow(/Bad deckcode/);

    expect(() => run(emptyDeck)).toThrow('Empty deckcode');
    await expect(runAsync(emptyDeck)).rejects.toThrow('Empty deckcode');

    expect(() => run(badHand)).toThrow(/Bad card name in acceptable_hand_list/);
    await expect(runAsync(badHand)).rejects.toThrow(/Bad card name in acceptable_hand_list/);
  });
});

describe('simulationFromConfigAsync', () => {
  const baseDeck = deckFromList(`
1 Llanowar Elves
6 Forest
`);
  const nonLand = [ALL_CARDS.cardFromName('Llanowar Elves')!];

  it('rejects runCount <= 0', async () => {
    await expect(
      simulationFromConfigAsync({
        runCount: 0,
        drawCount: 1,
        deck: baseDeck,
        mulligan: asNeverMulligan(),
        onThePlay: true,
        seed: 1,
      }),
    ).rejects.toThrow('runCount must be > 0');
    expect(() =>
      simulationFromConfig({
        runCount: -1,
        drawCount: 1,
        deck: baseDeck,
        mulligan: asNeverMulligan(),
        onThePlay: true,
        seed: 1,
      }),
    ).toThrow('runCount must be > 0');
  });

  it('matches seeded sequential simulationFromConfig', async () => {
    const config = {
      runCount: 80,
      drawCount: 1,
      deck: baseDeck,
      mulligan: asNeverMulligan(),
      onThePlay: true,
      seed: 21,
      parallel: false as const,
    };
    const sync = simulationFromConfig(config);
    const asyncSim = await simulationFromConfigAsync(config, { batchSize: 25 });
    expect(asyncSim).toEqual(sync);
  });

  it('matches seeded adaptive epsilon early-stop', async () => {
    const config = {
      runCount: 5000,
      drawCount: 1,
      deck: baseDeck,
      mulligan: asNeverMulligan(),
      onThePlay: true,
      seed: 33,
      epsilon: 0.05,
      parallel: false as const,
    };
    const sync = simulationFromConfigAdaptive(config, nonLand);
    const ticks: { completed: number; total: number }[] = [];
    const asyncSim = await simulationFromConfigAsync(config, {
      batchSize: 50,
      cards: nonLand,
      onProgress: (p) => ticks.push({ ...p }),
    });
    expect(asyncSim).toEqual(sync);
    expect(asyncSim.hands.length).toBeLessThan(config.runCount);
    expect(ticks.at(-1)!.completed).toBe(asyncSim.hands.length);
  });

  it('rejects when epsilon is set without cards', async () => {
    await expect(
      simulationFromConfigAsync({
        runCount: 100,
        drawCount: 1,
        deck: baseDeck,
        mulligan: asNeverMulligan(),
        onThePlay: true,
        seed: 9,
        epsilon: 0.05,
      }),
    ).rejects.toThrow('cards is required when epsilon is set');
  });

  it('rejects when signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const ticks: { completed: number }[] = [];
    await expect(
      simulationFromConfigAsync(
        {
          runCount: 60,
          drawCount: 1,
          deck: baseDeck,
          mulligan: asNeverMulligan(),
          onThePlay: true,
          seed: 8,
        },
        {
          batchSize: 20,
          signal: ac.signal,
          onProgress: (p) => ticks.push({ completed: p.completed }),
        },
      ),
    ).rejects.toSatisfy(isAbortError);
    expect(ticks).toEqual([]);
  });
});

describe('Karsten-style smoke (seeded)', () => {
  it('Llanowar Elves with enough forests is near 100% on the play', () => {
    const deck = deckFromList(`
1 Llanowar Elves
59 Forest
`);
    const sim = simulationFromConfig({
      runCount: 2000,
      drawCount: 1,
      deck,
      mulligan: asNeverMulligan(),
      onThePlay: true,
      seed: 1,
    });
    const card = ALL_CARDS.cardFromName('Llanowar Elves')!;
    const obs = observationsForCard(sim, card);
    expect(pManaGivenCmc(obs)).toBeGreaterThan(0.98);
  });
});
