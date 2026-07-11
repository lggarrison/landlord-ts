import { availableParallelism } from 'node:os';
import { isLandKind, type Card } from './card/index.js';
import type { Deck } from './deck.js';
import { deckFlatten } from './deck.js';
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
} from './hand.js';
import type { Mulligan, Rng } from './mulligan/types.js';
import { createEntropyRng, createMulberry32 } from './mulligan/types.js';
import { generateHandsParallelSync } from './parallel.js';

export type SimulationConfig = {
  runCount: number;
  drawCount: number;
  deck: Deck;
  mulligan: Mulligan;
  onThePlay: boolean;
  /** Optional seed for reproducible runs (tests). */
  seed?: number;
  /**
   * When set, `runs` is a maximum; stop early when the Wilson half-width of the
   * aggregate p_mana_given_cmc across observed CMC opportunities is below this.
   */
  epsilon?: number;
  /** Shard Monte Carlo trials across worker threads (Node). Default: true when runCount >= 2000. */
  parallel?: boolean;
  /** London/Never starting hand size used when reconstructing workers. */
  startingHandSize?: number;
  mulliganDownTo?: number;
  mulliganOnLands?: number[];
  acceptableHandList?: number[][];
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

/** Wilson score half-width for a binomial proportion (approx. 95% z=1.96). */
export function wilsonHalfWidth(successes: number, trials: number, z = 1.96): number {
  if (trials <= 0) return 1;
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const center = p + z2 / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials);
  const hi = (center + margin) / denom;
  const lo = (center - margin) / denom;
  return (hi - lo) / 2;
}

const PARALLEL_THRESHOLD = 2000;
const EARLY_STOP_BATCH = 1000;

function accumulateOpeningStats(hands: readonly Hand[]): {
  accumulatedOpeningHandSize: number;
  accumulatedOpeningHandLandCount: number;
} {
  return {
    accumulatedOpeningHandSize: hands.reduce((sum, hand) => sum + handOpening(hand).length, 0),
    accumulatedOpeningHandLandCount: hands.reduce(
      (sum, hand) => sum + countInOpeningWithDraws(hand, 0, (c) => isLandKind(c.kind)),
      0,
    ),
  };
}

function generateHandsSequential(
  runCount: number,
  mulligan: Mulligan,
  deck: readonly Card[],
  drawCount: number,
  seed: number | undefined,
): Hand[] {
  const rng: Rng = seed !== undefined ? createMulberry32(seed) : createEntropyRng();
  const hands: Hand[] = [];
  for (let i = 0; i < runCount; i++) {
    hands.push(handFromMulligan(mulligan, rng, deck, drawCount));
  }
  return hands;
}

function shouldParallel(config: SimulationConfig): boolean {
  if (config.parallel === false) return false;
  // Keep seeded runs on a single RNG stream unless parallel is forced.
  if (config.seed !== undefined && config.parallel !== true) return false;
  if (config.parallel === true) return config.runCount >= 2;
  return config.runCount >= PARALLEL_THRESHOLD;
}

export function simulationFromConfig(config: SimulationConfig): Simulation {
  if (config.runCount <= 0) throw new Error('runCount must be > 0');
  const deck = deckFlatten(config.deck);

  let hands: Hand[];
  if (shouldParallel(config)) {
    try {
      hands = generateHandsParallelSync({
        runCount: config.runCount,
        drawCount: config.drawCount,
        deck,
        seed: config.seed,
        startingHandSize: config.startingHandSize ?? 7,
        mulliganDownTo: config.mulliganDownTo ?? config.startingHandSize ?? 7,
        mulliganOnLands: config.mulliganOnLands ?? [],
        acceptableHandList: config.acceptableHandList ?? [],
        workers: Math.min(availableParallelism(), config.runCount),
      });
    } catch {
      hands = generateHandsSequential(
        config.runCount,
        config.mulligan,
        deck,
        config.drawCount,
        config.seed,
      );
    }
  } else {
    hands = generateHandsSequential(
      config.runCount,
      config.mulligan,
      deck,
      config.drawCount,
      config.seed,
    );
  }

  const stats = accumulateOpeningStats(hands);
  return {
    hands,
    ...stats,
    onThePlay: config.onThePlay,
  };
}

/**
 * Generate hands in batches, stopping early when aggregate Wilson half-width < epsilon.
 * `config.runCount` is the maximum.
 */
export function simulationFromConfigAdaptive(
  config: SimulationConfig,
  cards: readonly Card[],
): Simulation {
  if (config.epsilon === undefined) return simulationFromConfig(config);

  const maxRuns = config.runCount;
  const hands: Hand[] = [];
  let seed = config.seed;
  const playOrder = config.onThePlay ? PlayOrder.First : PlayOrder.Second;

  while (hands.length < maxRuns) {
    const batch = Math.min(EARLY_STOP_BATCH, maxRuns - hands.length);
    const batchConfig: SimulationConfig = {
      ...config,
      runCount: batch,
      seed,
      parallel: false,
    };
    const batchSim = simulationFromConfig(batchConfig);
    hands.push(...batchSim.hands);
    if (seed !== undefined) seed = (seed + batch * 0x9e3779b9) >>> 0;

    if (hands.length >= Math.min(EARLY_STOP_BATCH, maxRuns)) {
      if (aggregateWilsonMet(hands, cards, playOrder, config.epsilon)) break;
    }
  }

  const stats = accumulateOpeningStats(hands);
  return { hands, ...stats, onThePlay: config.onThePlay };
}

export type SimulationProgress = {
  completed: number;
  total: number;
};

export type SimulationAsyncOptions = {
  /**
   * Trials per progress tick when `epsilon` is unset (default 500).
   * Ignored when `epsilon` is set — batches use the same size as sync adaptive (1000).
   */
  batchSize?: number;
  onProgress?: (progress: SimulationProgress) => void;
  /** Required for Wilson early-stop when `config.epsilon` is set. */
  cards?: readonly Card[];
  /** When aborted, stops between batches (throws `AbortError`). */
  signal?: AbortSignal;
};

const DEFAULT_ASYNC_BATCH = 500;

function yieldMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

function aggregateWilsonMet(
  hands: readonly Hand[],
  cards: readonly Card[],
  playOrder: (typeof PlayOrder)[keyof typeof PlayOrder],
  epsilon: number,
): boolean {
  let mana = 0;
  let cmc = 0;
  const scratch = newScratch(30, 10);
  for (const card of cards) {
    if (isLandKind(card.kind)) continue;
    for (const hand of hands) {
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
          basicLandTypes: card.basicLandTypes ?? 0,
          checkTypes: card.checkTypes ?? 0,
          manaPerTap: card.manaPerTap ?? 1,
        };
        result = autoTapWithScratch(hand, goal, card.turn, playOrder, scratch);
        if (result.paid) break;
      }
      if (!result.cmc) continue;
      cmc += 1;
      if (result.paid) mana += 1;
    }
  }
  return cmc > 0 && wilsonHalfWidth(mana, cmc) < epsilon;
}

/**
 * Sequential batched hand generation with optional progress callbacks and event-loop yields.
 * Always single-threaded (`parallel` ignored) so hosts can flush SSE between batches.
 * Without `epsilon`, uses one continuous RNG stream (seeded runs match `simulationFromConfig` with parallel off).
 * With `epsilon`, batch size matches sync adaptive (`EARLY_STOP_BATCH`) so seeded results match `run()`.
 */
export async function simulationFromConfigAsync(
  config: SimulationConfig,
  options: SimulationAsyncOptions = {},
): Promise<Simulation> {
  if (config.runCount <= 0) throw new Error('runCount must be > 0');

  const onProgress = options.onProgress;
  const signal = options.signal;
  const total = config.runCount;
  const deck = deckFlatten(config.deck);
  const playOrder = config.onThePlay ? PlayOrder.First : PlayOrder.Second;

  const report = async (completed: number) => {
    throwIfAborted(signal);
    onProgress?.({ completed, total });
    await yieldMacrotask();
    throwIfAborted(signal);
  };

  if (config.epsilon !== undefined) {
    if (options.cards === undefined) {
      throw new Error('cards is required when epsilon is set');
    }
    // Match simulationFromConfigAdaptive batching for seeded parity.
    const batchSize = EARLY_STOP_BATCH;
    const cards = options.cards;
    const hands: Hand[] = [];
    let seed = config.seed;

    while (hands.length < total) {
      throwIfAborted(signal);
      const batch = Math.min(batchSize, total - hands.length);
      const batchConfig: SimulationConfig = {
        ...config,
        runCount: batch,
        seed,
        parallel: false,
        epsilon: undefined,
      };
      const batchSim = simulationFromConfig(batchConfig);
      hands.push(...batchSim.hands);
      if (seed !== undefined) seed = (seed + batch * 0x9e3779b9) >>> 0;
      await report(hands.length);

      if (
        hands.length >= Math.min(EARLY_STOP_BATCH, total) &&
        aggregateWilsonMet(hands, cards, playOrder, config.epsilon)
      ) {
        break;
      }
    }

    const stats = accumulateOpeningStats(hands);
    return { hands, ...stats, onThePlay: config.onThePlay };
  }

  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_ASYNC_BATCH);
  // Continuous RNG so seeded async batches match sequential simulationFromConfig.
  const rng: Rng = config.seed !== undefined ? createMulberry32(config.seed) : createEntropyRng();
  const hands: Hand[] = [];
  while (hands.length < total) {
    throwIfAborted(signal);
    const n = Math.min(batchSize, total - hands.length);
    for (let i = 0; i < n; i++) {
      hands.push(handFromMulligan(config.mulligan, rng, deck, config.drawCount));
    }
    await report(hands.length);
  }

  const stats = accumulateOpeningStats(hands);
  return { hands, ...stats, onThePlay: config.onThePlay };
}

export function observationsForCard(sim: Simulation, card: Card): Observations {
  return observationsForCardByTurn(sim, card, card.turn);
}

export function observationsForCardByTurn(sim: Simulation, card: Card, turn: number): Observations {
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
        basicLandTypes: card.basicLandTypes ?? 0,
        checkTypes: card.checkTypes ?? 0,
        manaPerTap: card.manaPerTap ?? 1,
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
