/**
 * Public run() / runAsync() façade — Arena decklist → Monte Carlo on-curve report.
 * Input field names use snake_case (mtgoncurve-inspired).
 */
import {
  CardKind,
  countManaColor,
  isLand,
  manaCostCmc,
  newManaColorCount,
  type Card,
  type ManaColorCount,
} from './card/index.js';
import { ALL_CARDS } from './data.js';
import { deckFromList, deckIsEmpty, deckIter, DeckcodeError, type Deck } from './deck.js';
import { asLondonMulligan, londonNever } from './mulligan/index.js';
import {
  buildObservationsReport,
  emptyObservationsReport,
  type CardObservationsReport,
  type ColorConstrainedEntry,
  type DrawDependentEntry,
  type WeakestOnCurveEntry,
} from './observations-report.js';
import {
  observationsForCardByTurn,
  simulationFromConfig,
  simulationFromConfigAdaptive,
  simulationFromConfigAsync,
  type Simulation,
  type SimulationConfig,
} from './simulation.js';
import { yieldMacrotask } from './yield-macrotask.js';

export type {
  CardObservationsReport,
  ColorConstrainedEntry,
  DrawDependentEntry,
  WeakestOnCurveEntry,
} from './observations-report.js';

export { COLOR_CONSTRAINED_THRESHOLD, DRAW_DEPENDENT_THRESHOLD } from './observations-report.js';

/** Thrown for invalid `RunInput` (bad deckcode, empty deck, bad acceptable hands). */
export class RunValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RunValidationError';
  }
}

export type RunInput = {
  code: string;
  runs: number;
  on_the_play: boolean;
  mulligan_down_to: number;
  mulligan_on_lands: number[];
  acceptable_hand_list: string[][];
  /** Optional RNG seed for reproducible runs. */
  seed?: number;
  /** Optional starting hand size (default 7). */
  starting_hand_size?: number;
  /**
   * Optional early-stop half-width on aggregate p_mana_given_cmc.
   * When set, `runs` is treated as a maximum.
   */
  epsilon?: number;
  /** Shard trials across worker threads (default: auto when runs >= 2000). */
  parallel?: boolean;
};

export type RunProgressPhase = 'simulating' | 'scoring';

export type RunProgress = {
  completed: number;
  total: number;
  /** `simulating` during hand batches; `scoring` once before report build. */
  phase: RunProgressPhase;
};

export type RunAsyncInput = RunInput & {
  on_progress?: (progress: RunProgress) => void;
  /**
   * Trials per progress tick when `epsilon` is unset (default 500).
   * Ignored when `epsilon` is set (uses the same 1000-trial batches as sync adaptive).
   */
  batch_size?: number;
  /** When aborted, stops between batches (throws `AbortError`). */
  signal?: AbortSignal;
};

export type LandCount = {
  name: string;
  mana_cost: string;
  image_uri: string;
  kind: CardKind;
  copies: number;
  hash: number;
};

export type RunOutput = {
  total_simulations: number;
  avg_opening_hand_size: number;
  avg_opening_land_count: number;
  deck_size: number;
  deck_average_cmc: number;
  cards: CardObservationsReport[];
  weakest_on_curve: WeakestOnCurveEntry[];
  color_constrained: ColorConstrainedEntry[];
  draw_dependent: DrawDependentEntry[];
  land_counts: LandCount[];
  total_land_counts: ManaColorCount;
  basic_land_counts: ManaColorCount;
  tap_land_counts: ManaColorCount;
  check_land_counts: ManaColorCount;
  shock_land_counts: ManaColorCount;
  fast_land_counts: ManaColorCount;
  slow_land_counts: ManaColorCount;
  battle_land_counts: ManaColorCount;
  turn_land_counts: ManaColorCount;
  surveil_land_counts: ManaColorCount;
  bounce_land_counts: ManaColorCount;
  triome_land_counts: ManaColorCount;
  cycling_land_counts: ManaColorCount;
  pain_land_counts: ManaColorCount;
  fetch_land_counts: ManaColorCount;
  canopy_land_counts: ManaColorCount;
  pathway_land_counts: ManaColorCount;
  other_land_counts: ManaColorCount;
  non_land_counts: ManaColorCount;
};

/** SSE `data:` payload shapes for wiki Pattern A hosts (types only). */
export type SimulateProgressEvent = { type: 'progress' } & RunProgress;
export type SimulateDoneEvent = { type: 'done'; result: RunOutput };
export type SimulateErrorEvent = { type: 'error'; message: string };
export type SimulateStreamEvent = SimulateProgressEvent | SimulateDoneEvent | SimulateErrorEvent;

type PreparedRun = {
  deck: Deck;
  simConfig: SimulationConfig;
  nonLandCards: Card[];
};

function emptyLandCounts(): Pick<
  RunOutput,
  | 'total_land_counts'
  | 'basic_land_counts'
  | 'tap_land_counts'
  | 'check_land_counts'
  | 'shock_land_counts'
  | 'fast_land_counts'
  | 'slow_land_counts'
  | 'battle_land_counts'
  | 'turn_land_counts'
  | 'surveil_land_counts'
  | 'bounce_land_counts'
  | 'triome_land_counts'
  | 'cycling_land_counts'
  | 'pain_land_counts'
  | 'fetch_land_counts'
  | 'canopy_land_counts'
  | 'pathway_land_counts'
  | 'other_land_counts'
  | 'non_land_counts'
> {
  return {
    total_land_counts: newManaColorCount(),
    basic_land_counts: newManaColorCount(),
    tap_land_counts: newManaColorCount(),
    check_land_counts: newManaColorCount(),
    shock_land_counts: newManaColorCount(),
    fast_land_counts: newManaColorCount(),
    slow_land_counts: newManaColorCount(),
    battle_land_counts: newManaColorCount(),
    turn_land_counts: newManaColorCount(),
    surveil_land_counts: newManaColorCount(),
    bounce_land_counts: newManaColorCount(),
    triome_land_counts: newManaColorCount(),
    cycling_land_counts: newManaColorCount(),
    pain_land_counts: newManaColorCount(),
    fetch_land_counts: newManaColorCount(),
    canopy_land_counts: newManaColorCount(),
    pathway_land_counts: newManaColorCount(),
    other_land_counts: newManaColorCount(),
    non_land_counts: newManaColorCount(),
  };
}

function emptyOutput(): RunOutput {
  const report = emptyObservationsReport();
  return {
    ...report,
    land_counts: [],
    ...emptyLandCounts(),
  };
}

function prepareRun(input: RunInput): PreparedRun {
  let deck;
  try {
    deck = deckFromList(input.code);
  } catch (e) {
    const msg = e instanceof DeckcodeError ? e.message : String(e);
    throw new RunValidationError(`Bad deckcode: ${msg}`, { cause: e });
  }
  if (deckIsEmpty(deck)) {
    throw new RunValidationError('Empty deckcode');
  }

  const highestTurn = deckIter(deck).reduce((max, c) => Math.max(max, c.card.turn), 0);
  const startingHandSize = input.starting_hand_size ?? 7;

  const london = londonNever();
  london.startingHandSize = startingHandSize;
  london.mulliganDownTo = input.mulligan_down_to;
  london.mulliganOnLands = new Set(input.mulligan_on_lands);

  const acceptableHashes: number[][] = [];
  for (let i = 0; i < input.acceptable_hand_list.length; i++) {
    const acceptableHand = input.acceptable_hand_list[i]!;
    const keepCards = new Set<number>();
    for (const cardName of acceptableHand) {
      const card = ALL_CARDS.cardFromName(cardName);
      if (!card) {
        throw new RunValidationError(`Bad card name in acceptable_hand_list row ${i}: ${cardName}`);
      }
      keepCards.add(card.hash);
    }
    if (keepCards.size > 0) {
      london.acceptableHandList.push(keepCards);
      acceptableHashes.push([...keepCards]);
    }
  }

  const simConfig: SimulationConfig = {
    runCount: input.runs,
    drawCount: highestTurn,
    mulligan: asLondonMulligan(london),
    deck,
    onThePlay: input.on_the_play,
    seed: input.seed,
    epsilon: input.epsilon,
    parallel: input.parallel,
    startingHandSize,
    mulliganDownTo: input.mulligan_down_to,
    mulliganOnLands: input.mulligan_on_lands,
    acceptableHandList: acceptableHashes,
  };

  const nonLandCards = deckIter(deck)
    .filter((c) => !isLand(c.card))
    .map((c) => c.card);

  return { deck, simConfig, nonLandCards };
}

function simulationToOutput(deck: Deck, sim: Simulation): RunOutput {
  const outputs = emptyOutput();

  const nonLandWithObs = deckIter(deck)
    .filter((c) => !isLand(c.card))
    .map((c) => ({
      name: c.card.name,
      mana_cost: c.card.manaCostString,
      image_uri: c.card.imageUri,
      kind: c.card.kind,
      turn: c.card.turn,
      copies: c.count,
      cmc: manaCostCmc(c.card.manaCost),
      observations: observationsForCardByTurn(sim, c.card, c.card.turn),
    }));

  const deckLen = deck.cardCount;
  const nonLandEntries = deckIter(deck).filter((c) => !isLand(c.card));
  const nonLandCount = nonLandEntries.reduce((n, c) => n + c.count, 0);
  const deckAverageCmc =
    nonLandCount === 0
      ? 0
      : nonLandEntries.reduce((sum, c) => sum + c.count * manaCostCmc(c.card.manaCost), 0) /
        nonLandCount;

  const report = buildObservationsReport({
    cards: nonLandWithObs,
    total_simulations: sim.hands.length,
    accumulated_opening_hand_size: sim.accumulatedOpeningHandSize,
    accumulated_opening_hand_land_count: sim.accumulatedOpeningHandLandCount,
    deck_size: deckLen,
    deck_average_cmc: deckAverageCmc,
  });

  outputs.total_simulations = report.total_simulations;
  outputs.avg_opening_hand_size = report.avg_opening_hand_size;
  outputs.avg_opening_land_count = report.avg_opening_land_count;
  outputs.deck_size = report.deck_size;
  outputs.deck_average_cmc = report.deck_average_cmc;
  outputs.cards = report.cards;
  outputs.weakest_on_curve = report.weakest_on_curve;
  outputs.color_constrained = report.color_constrained;
  outputs.draw_dependent = report.draw_dependent;

  outputs.land_counts = deckIter(deck)
    .filter((c) => isLand(c.card))
    .map((c) => ({
      name: c.card.name,
      mana_cost: c.card.manaCostString,
      image_uri: c.card.imageUri,
      kind: c.card.kind,
      copies: c.count,
      hash: c.card.hash,
    }));
  outputs.land_counts.sort(
    (a, b) => String(a.kind).localeCompare(String(b.kind)) || a.name.localeCompare(b.name),
  );

  for (const cc of deckIter(deck)) {
    for (let i = 0; i < cc.count; i++) {
      const card = cc.card;
      if (isLand(card)) {
        countManaColor(outputs.total_land_counts, card.manaCost);
      }
      switch (card.kind) {
        case CardKind.BasicLand:
          countManaColor(outputs.basic_land_counts, card.manaCost);
          break;
        case CardKind.CheckLand:
          countManaColor(outputs.check_land_counts, card.manaCost);
          break;
        case CardKind.TapLand:
          countManaColor(outputs.tap_land_counts, card.manaCost);
          break;
        case CardKind.ShockLand:
          countManaColor(outputs.shock_land_counts, card.manaCost);
          break;
        case CardKind.FastLand:
          countManaColor(outputs.fast_land_counts, card.manaCost);
          break;
        case CardKind.SlowLand:
          countManaColor(outputs.slow_land_counts, card.manaCost);
          break;
        case CardKind.BattleLand:
          countManaColor(outputs.battle_land_counts, card.manaCost);
          break;
        case CardKind.TurnLand:
          countManaColor(outputs.turn_land_counts, card.manaCost);
          break;
        case CardKind.SurveilLand:
          countManaColor(outputs.surveil_land_counts, card.manaCost);
          break;
        case CardKind.BounceLand:
          countManaColor(outputs.bounce_land_counts, card.manaCost);
          break;
        case CardKind.TriomeLand:
          countManaColor(outputs.triome_land_counts, card.manaCost);
          break;
        case CardKind.CyclingLand:
          countManaColor(outputs.cycling_land_counts, card.manaCost);
          break;
        case CardKind.PainLand:
          countManaColor(outputs.pain_land_counts, card.manaCost);
          break;
        case CardKind.FetchLand:
          countManaColor(outputs.fetch_land_counts, card.manaCost);
          break;
        case CardKind.CanopyLand:
          countManaColor(outputs.canopy_land_counts, card.manaCost);
          break;
        case CardKind.PathwayLand:
          countManaColor(outputs.pathway_land_counts, card.manaCost);
          break;
        case CardKind.OtherLand:
        case CardKind.ForcedLand:
          countManaColor(outputs.other_land_counts, card.manaCost);
          break;
        default:
          countManaColor(outputs.non_land_counts, card.manaCost);
          break;
      }
    }
  }

  return outputs;
}

/**
 * Run a Monte Carlo simulation for an Arena decklist.
 * Returns a single flattened on-curve report (`cards`, insights, land tallies).
 */
export function run(input: RunInput): RunOutput {
  const { deck, simConfig, nonLandCards } = prepareRun(input);
  const sim =
    input.epsilon !== undefined
      ? simulationFromConfigAdaptive(simConfig, nonLandCards)
      : simulationFromConfig(simConfig);
  return simulationToOutput(deck, sim);
}

/**
 * Async Monte Carlo run with optional progress callbacks for streaming hosts (e.g. SSE).
 * Always sequential batches (`parallel` ignored) so the event loop can flush between ticks.
 * Emits `phase: 'simulating'` after each hand batch, then `phase: 'scoring'` before report build.
 */
export async function runAsync(input: RunAsyncInput): Promise<RunOutput> {
  const { deck, simConfig, nonLandCards } = prepareRun(input);
  const onProgress = input.on_progress;
  const signal = input.signal;
  const sim = await simulationFromConfigAsync(simConfig, {
    batchSize: input.batch_size,
    onProgress: onProgress ? (p) => onProgress({ ...p, phase: 'simulating' }) : undefined,
    cards: nonLandCards,
    signal,
  });

  signal?.throwIfAborted();
  if (onProgress) {
    onProgress({
      completed: sim.hands.length,
      total: simConfig.runCount,
      phase: 'scoring',
    });
  }
  // Yield when a host may flush progress or observe cancellation before report build.
  if (onProgress !== undefined || signal !== undefined) {
    await yieldMacrotask();
    signal?.throwIfAborted();
  }
  return simulationToOutput(deck, sim);
}
