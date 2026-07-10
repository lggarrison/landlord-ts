import { describe, expect, it } from "vitest";
import { ALL_CARDS, pManaGivenCmc, run } from "../src/index.js";
import { deckFromList } from "../src/deck.js";
import { asNeverMulligan } from "../src/mulligan/index.js";
import {
  observationsForCard,
  simulationFromConfig,
} from "../src/simulation.js";

describe("card database", () => {
  it("loads Forest and Opt", () => {
    expect(ALL_CARDS.cardFromName("Forest")).toBeTruthy();
    expect(ALL_CARDS.cardFromName("Opt")).toBeTruthy();
    expect(ALL_CARDS.cardFromName("Steam Vents")).toBeTruthy();
  });
});

describe("run() façade", () => {
  it("simulates a tiny green deck", () => {
    const output = run({
      code: `
1 Llanowar Elves
6 Forest
`,
      runs: 200,
      on_the_play: true,
      mulligan_down_to: 7,
      mulligan_on_lands: [],
      acceptable_hand_list: [],
      seed: 42,
    });
    expect(output.deck_size).toBe(7);
    expect(output.card_observations.length).toBeGreaterThan(0);
    const elves = output.card_observations.find(
      (o) => o.card.name === "Llanowar Elves",
    );
    expect(elves).toBeTruthy();
    expect(elves!.observations.totalRuns).toBe(200);
    expect(pManaGivenCmc(elves!.observations)).toBeGreaterThan(0.9);
  });
});

describe("Karsten-style smoke (seeded)", () => {
  it("Llanowar Elves with enough forests is near 100% on the play", () => {
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
    const card = ALL_CARDS.cardFromName("Llanowar Elves")!;
    const obs = observationsForCard(sim, card);
    expect(pManaGivenCmc(obs)).toBeGreaterThan(0.98);
  });
});
