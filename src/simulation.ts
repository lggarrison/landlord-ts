import { isLandKind, type Card } from "./card/index.js";
import type { Deck } from "./deck.js";
import { deckFlatten } from "./deck.js";
import {
  autoTapWithScratch,
  countInOpeningWithDraws,
  handFromMulligan,
  handOpening,
  newScratch,
  PlayOrder,
  type AutoTapResult,
  type Hand,
  type SimCard,
} from "./hand.js";
import type { Mulligan, Rng } from "./mulligan/types.js";
import { createEntropyRng, createMulberry32 } from "./mulligan/types.js";

export type SimulationConfig = {
  runCount: number;
  drawCount: number;
  deck: Deck;
  mulligan: Mulligan;
  onThePlay: boolean;
  /** Optional seed for reproducible runs (tests). */
  seed?: number;
};

export type Simulation = {
  hands: Hand[];
  accumulatedOpeningHandSize: number;
  accumulatedOpeningHandLandCount: number;
  onThePlay: boolean;
};

export type Observations = {
  mana: number;
  cmc: number;
  play: number;
  inOpeningHand: number;
  totalRuns: number;
};

export function newObservations(): Observations {
  return { mana: 0, cmc: 0, play: 0, inOpeningHand: 0, totalRuns: 0 };
}

export function pMana(obs: Observations): number {
  return obs.mana / obs.totalRuns;
}

export function pManaGivenCmc(obs: Observations): number {
  return obs.cmc === 0 ? 0 : obs.mana / obs.cmc;
}

export function pPlay(obs: Observations): number {
  return obs.play / obs.totalRuns;
}

export function simulationFromConfig(config: SimulationConfig): Simulation {
  if (config.runCount <= 0) throw new Error("runCount must be > 0");
  const rng: Rng =
    config.seed !== undefined
      ? createMulberry32(config.seed)
      : createEntropyRng();
  const deck = deckFlatten(config.deck);
  const hands: Hand[] = [];
  for (let i = 0; i < config.runCount; i++) {
    hands.push(handFromMulligan(config.mulligan, rng, deck, config.drawCount));
  }
  const accumulatedOpeningHandSize = hands.reduce(
    (sum, hand) => sum + handOpening(hand).length,
    0,
  );
  const accumulatedOpeningHandLandCount = hands.reduce(
    (sum, hand) =>
      sum + countInOpeningWithDraws(hand, 0, (c) => isLandKind(c.kind)),
    0,
  );
  return {
    hands,
    accumulatedOpeningHandSize,
    accumulatedOpeningHandLandCount,
    onThePlay: config.onThePlay,
  };
}

export function observationsForCard(sim: Simulation, card: Card): Observations {
  return observationsForCardByTurn(sim, card, card.turn);
}

export function observationsForCardByTurn(
  sim: Simulation,
  card: Card,
  turn: number,
): Observations {
  const observations = newObservations();
  observations.totalRuns = sim.hands.length;
  const scratch = newScratch(30, 10);
  const playOrder = sim.onThePlay ? PlayOrder.First : PlayOrder.Second;

  for (const hand of sim.hands) {
    let result: AutoTapResult = {
      paid: false,
      cmc: false,
      inOpeningHand: false,
      inDrawHand: false,
    };
    for (const manaCost of card.allManaCosts) {
      const goal: SimCard = {
        hash: card.hash,
        manaCost: { ...manaCost },
        kind: card.kind,
      };
      result = autoTapWithScratch(hand, goal, turn, playOrder, scratch);
      if (result.paid) break;
    }
    if (result.inOpeningHand) observations.inOpeningHand += 1;
    if (!result.cmc) continue;
    observations.cmc += 1;
    if (result.paid) {
      observations.mana += 1;
      if (result.inOpeningHand || result.inDrawHand) {
        observations.play += 1;
      }
    }
  }
  return observations;
}
