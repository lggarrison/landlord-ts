/**
 * Public run() / runAsync() façade — Arena decklist → Monte Carlo on-curve report.
 * Public field names use camelCase.
 */
import {
  CardKind,
  countManaColor,
  isLand,
  manaCostCmc,
  newManaColorCount,
  type Card,
  type ManaColorCount,
  type ManaCost,
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
  onThePlay: boolean;
  mulliganDownTo: number;
  mulliganOnLands: number[];
  acceptableHandList: string[][];
  /** Optional RNG seed for reproducible runs. */
  seed?: number;
  /** Optional starting hand size (default 7). */
  startingHandSize?: number;
  /**
   * Optional early-stop half-width on aggregate pManaGivenCmc.
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
  onProgress?: (progress: RunProgress) => void;
  /**
   * Trials per progress tick when `epsilon` is unset (default 500).
   * Ignored when `epsilon` is set (uses the same 1000-trial batches as sync adaptive).
   */
  batchSize?: number;
  /** When aborted, stops between batches (throws `AbortError`). */
  signal?: AbortSignal;
};

export type ProducedMana = Pick<ManaCost, 'w' | 'u' | 'b' | 'r' | 'g' | 'c'>;

function producedManaFrom(cost: ManaCost): ProducedMana {
  return { w: cost.w, u: cost.u, b: cost.b, r: cost.r, g: cost.g, c: cost.c };
}

export type LandCount = {
  name: string;
  /** Casting cost string (empty for most lands). Prefer `producedMana` for mana-source UI. */
  manaCost: string;
  /** Colors this land can produce when tapped (0/1 flags per color). */
  producedMana: ProducedMana;
  imageUri: string;
  kind: CardKind;
  copies: number;
  hash: number;
};

export type RunOutput = {
  totalSimulations: number;
  avgOpeningHandSize: number;
  avgOpeningLandCount: number;
  deckSize: number;
  deckAverageCmc: number;
  cards: CardObservationsReport[];
  weakestOnCurve: WeakestOnCurveEntry[];
  colorConstrained: ColorConstrainedEntry[];
  drawDependent: DrawDependentEntry[];
  landCounts: LandCount[];
  totalLandCounts: ManaColorCount;
  basicLandCounts: ManaColorCount;
  tapLandCounts: ManaColorCount;
  checkLandCounts: ManaColorCount;
  shockLandCounts: ManaColorCount;
  fastLandCounts: ManaColorCount;
  slowLandCounts: ManaColorCount;
  battleLandCounts: ManaColorCount;
  turnLandCounts: ManaColorCount;
  surveilLandCounts: ManaColorCount;
  bounceLandCounts: ManaColorCount;
  triomeLandCounts: ManaColorCount;
  cyclingLandCounts: ManaColorCount;
  painLandCounts: ManaColorCount;
  fetchLandCounts: ManaColorCount;
  canopyLandCounts: ManaColorCount;
  pathwayLandCounts: ManaColorCount;
  otherLandCounts: ManaColorCount;
  nonLandCounts: ManaColorCount;
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
  | 'totalLandCounts'
  | 'basicLandCounts'
  | 'tapLandCounts'
  | 'checkLandCounts'
  | 'shockLandCounts'
  | 'fastLandCounts'
  | 'slowLandCounts'
  | 'battleLandCounts'
  | 'turnLandCounts'
  | 'surveilLandCounts'
  | 'bounceLandCounts'
  | 'triomeLandCounts'
  | 'cyclingLandCounts'
  | 'painLandCounts'
  | 'fetchLandCounts'
  | 'canopyLandCounts'
  | 'pathwayLandCounts'
  | 'otherLandCounts'
  | 'nonLandCounts'
> {
  return {
    totalLandCounts: newManaColorCount(),
    basicLandCounts: newManaColorCount(),
    tapLandCounts: newManaColorCount(),
    checkLandCounts: newManaColorCount(),
    shockLandCounts: newManaColorCount(),
    fastLandCounts: newManaColorCount(),
    slowLandCounts: newManaColorCount(),
    battleLandCounts: newManaColorCount(),
    turnLandCounts: newManaColorCount(),
    surveilLandCounts: newManaColorCount(),
    bounceLandCounts: newManaColorCount(),
    triomeLandCounts: newManaColorCount(),
    cyclingLandCounts: newManaColorCount(),
    painLandCounts: newManaColorCount(),
    fetchLandCounts: newManaColorCount(),
    canopyLandCounts: newManaColorCount(),
    pathwayLandCounts: newManaColorCount(),
    otherLandCounts: newManaColorCount(),
    nonLandCounts: newManaColorCount(),
  };
}

function emptyOutput(): RunOutput {
  const report = emptyObservationsReport();
  return {
    ...report,
    landCounts: [],
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
  const startingHandSize = input.startingHandSize ?? 7;

  const london = londonNever();
  london.startingHandSize = startingHandSize;
  london.mulliganDownTo = input.mulliganDownTo;
  london.mulliganOnLands = new Set(input.mulliganOnLands);

  const acceptableHashes: number[][] = [];
  for (let i = 0; i < input.acceptableHandList.length; i++) {
    const acceptableHand = input.acceptableHandList[i]!;
    const keepCards = new Set<number>();
    for (const cardName of acceptableHand) {
      const card = ALL_CARDS.cardFromName(cardName);
      if (!card) {
        throw new RunValidationError(`Bad card name in acceptableHandList row ${i}: ${cardName}`);
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
    onThePlay: input.onThePlay,
    seed: input.seed,
    epsilon: input.epsilon,
    parallel: input.parallel,
    startingHandSize,
    mulliganDownTo: input.mulliganDownTo,
    mulliganOnLands: input.mulliganOnLands,
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
      manaCost: c.card.manaCostString,
      imageUri: c.card.imageUri,
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
    totalSimulations: sim.hands.length,
    accumulatedOpeningHandSize: sim.accumulatedOpeningHandSize,
    accumulatedOpeningHandLandCount: sim.accumulatedOpeningHandLandCount,
    deckSize: deckLen,
    deckAverageCmc,
  });

  outputs.totalSimulations = report.totalSimulations;
  outputs.avgOpeningHandSize = report.avgOpeningHandSize;
  outputs.avgOpeningLandCount = report.avgOpeningLandCount;
  outputs.deckSize = report.deckSize;
  outputs.deckAverageCmc = report.deckAverageCmc;
  outputs.cards = report.cards;
  outputs.weakestOnCurve = report.weakestOnCurve;
  outputs.colorConstrained = report.colorConstrained;
  outputs.drawDependent = report.drawDependent;

  outputs.landCounts = deckIter(deck)
    .filter((c) => isLand(c.card))
    .map((c) => ({
      name: c.card.name,
      manaCost: c.card.manaCostString,
      producedMana: producedManaFrom(c.card.manaCost),
      imageUri: c.card.imageUri,
      kind: c.card.kind,
      copies: c.count,
      hash: c.card.hash,
    }));
  outputs.landCounts.sort(
    (a, b) => String(a.kind).localeCompare(String(b.kind)) || a.name.localeCompare(b.name),
  );

  for (const cc of deckIter(deck)) {
    for (let i = 0; i < cc.count; i++) {
      const card = cc.card;
      if (isLand(card)) {
        countManaColor(outputs.totalLandCounts, card.manaCost);
      }
      switch (card.kind) {
        case CardKind.BasicLand:
          countManaColor(outputs.basicLandCounts, card.manaCost);
          break;
        case CardKind.CheckLand:
          countManaColor(outputs.checkLandCounts, card.manaCost);
          break;
        case CardKind.TapLand:
          countManaColor(outputs.tapLandCounts, card.manaCost);
          break;
        case CardKind.ShockLand:
          countManaColor(outputs.shockLandCounts, card.manaCost);
          break;
        case CardKind.FastLand:
          countManaColor(outputs.fastLandCounts, card.manaCost);
          break;
        case CardKind.SlowLand:
          countManaColor(outputs.slowLandCounts, card.manaCost);
          break;
        case CardKind.BattleLand:
          countManaColor(outputs.battleLandCounts, card.manaCost);
          break;
        case CardKind.TurnLand:
          countManaColor(outputs.turnLandCounts, card.manaCost);
          break;
        case CardKind.SurveilLand:
          countManaColor(outputs.surveilLandCounts, card.manaCost);
          break;
        case CardKind.BounceLand:
          countManaColor(outputs.bounceLandCounts, card.manaCost);
          break;
        case CardKind.TriomeLand:
          countManaColor(outputs.triomeLandCounts, card.manaCost);
          break;
        case CardKind.CyclingLand:
          countManaColor(outputs.cyclingLandCounts, card.manaCost);
          break;
        case CardKind.PainLand:
          countManaColor(outputs.painLandCounts, card.manaCost);
          break;
        case CardKind.FetchLand:
          countManaColor(outputs.fetchLandCounts, card.manaCost);
          break;
        case CardKind.CanopyLand:
          countManaColor(outputs.canopyLandCounts, card.manaCost);
          break;
        case CardKind.PathwayLand:
          countManaColor(outputs.pathwayLandCounts, card.manaCost);
          break;
        case CardKind.OtherLand:
        case CardKind.ForcedLand:
          countManaColor(outputs.otherLandCounts, card.manaCost);
          break;
        default:
          countManaColor(outputs.nonLandCounts, card.manaCost);
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
  const onProgress = input.onProgress;
  const signal = input.signal;
  const sim = await simulationFromConfigAsync(simConfig, {
    batchSize: input.batchSize,
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
