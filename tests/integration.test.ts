import { describe, expect, it } from 'vitest';
import { ALL_CARDS, pManaGivenCmc, run, runAsync, type RunProgress } from '../src/index.js';
import { deckFromList } from '../src/deck.js';
import { asNeverMulligan } from '../src/mulligan/index.js';
import { observationsForCard, simulationFromConfig } from '../src/simulation.js';

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
    expect(output.card_observations.length).toBeGreaterThan(0);
    const elves = output.card_observations.find((o) => o.card.name === 'Llanowar Elves');
    expect(elves).toBeTruthy();
    expect(elves!.observations.totalRuns).toBe(200);
    expect(pManaGivenCmc(elves!.observations)).toBeGreaterThan(0.9);
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
    const elves = output.card_observations.find((o) => o.card.name === 'Llanowar Elves');
    expect(elves!.observations.totalRuns).toBe(runs);
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
