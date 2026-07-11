/**
 * mtgoncurve.com-compatible façade — port of lib/src/mtgoncurve.rs
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
  type ObservationsReport,
} from './observations-report.js';
import {
  newObservations,
  observationsForCardByTurn,
  simulationFromConfig,
  simulationFromConfigAdaptive,
  simulationFromConfigAsync,
  type Observations,
  type Simulation,
  type SimulationConfig,
} from './simulation.js';

export type { ObservationsReport } from './observations-report.js';
export type {
  CardObservationsReport,
  ColorConstrainedEntry,
  DrawDependentEntry,
  WeakestOnCurveEntry,
} from './observations-report.js';

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

export type RunProgress = {
  completed: number;
  total: number;
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

export type MtgOnCurveCard = {
  name: string;
  mana_cost_string: string;
  image_uri: string;
  kind: CardKind;
  hash: number;
  turn: number;
  mana_cost: ManaCost;
};

export type CardObservation = {
  card: MtgOnCurveCard;
  cmc: number;
  card_count: number;
  observations: Observations;
};

export type RunOutput = {
  card_observations: CardObservation[];
  /** User-facing on-curve report (success/miss/failure modes); independent of card_observations. */
  observations_report: ObservationsReport;
  land_counts: CardObservation[];
  deck_size: number;
  accumulated_opening_hand_size: number;
  accumulated_opening_hand_land_count: number;
  deck_average_cmc: number;
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

type PreparedRun = {
  deck: Deck;
  simConfig: SimulationConfig;
  nonLandCards: Card[];
};

function toMtgCard(card: Card): MtgOnCurveCard {
  return {
    name: card.name,
    mana_cost_string: card.manaCostString,
    image_uri: card.imageUri,
    kind: card.kind,
    hash: card.hash,
    turn: card.turn,
    mana_cost: { ...card.manaCost },
  };
}

function emptyOutput(): RunOutput {
  return {
    card_observations: [],
    observations_report: emptyObservationsReport(),
    land_counts: [],
    deck_size: 0,
    accumulated_opening_hand_size: 0,
    accumulated_opening_hand_land_count: 0,
    deck_average_cmc: 0,
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

function prepareRun(input: RunInput): PreparedRun {
  let deck;
  try {
    deck = deckFromList(input.code);
  } catch (e) {
    const msg = e instanceof DeckcodeError ? e.message : String(e);
    throw new Error(`Bad deckcode: ${msg}`);
  }
  if (deckIsEmpty(deck)) {
    throw new Error('Empty deckcode');
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
        throw new Error(`Bad card name in acceptable_hand_list row ${i}: ${cardName}`);
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
  outputs.accumulated_opening_hand_size = sim.accumulatedOpeningHandSize;
  outputs.accumulated_opening_hand_land_count = sim.accumulatedOpeningHandLandCount;

  const nonLandWithObs = deckIter(deck)
    .filter((c) => !isLand(c.card))
    .map((c) => {
      const observations = observationsForCardByTurn(sim, c.card, c.card.turn);
      const mtgCard = toMtgCard(c.card);
      const cmc = manaCostCmc(c.card.manaCost);
      return {
        card: mtgCard,
        cmc,
        card_count: c.count,
        observations,
      };
    });

  outputs.card_observations = nonLandWithObs.map((row) => ({
    card: row.card,
    cmc: row.cmc,
    card_count: row.card_count,
    observations: row.observations,
  }));
  outputs.card_observations.sort((a, b) => a.card.name.localeCompare(b.card.name));
  outputs.card_observations.sort(
    (a, b) => manaCostCmc(a.card.mana_cost) - manaCostCmc(b.card.mana_cost),
  );

  outputs.land_counts = deckIter(deck)
    .filter((c) => isLand(c.card))
    .map((c) => ({
      card: toMtgCard(c.card),
      cmc: manaCostCmc(c.card.manaCost),
      card_count: c.count,
      observations: newObservations(),
    }));
  outputs.land_counts.sort((a, b) => a.card.name.localeCompare(b.card.name));
  outputs.land_counts.sort((a, b) => String(a.card.kind).localeCompare(String(b.card.kind)));

  const deckLen = deck.cardCount;
  outputs.deck_size = deckLen;
  const nonLandEntries = deckIter(deck).filter((c) => !isLand(c.card));
  const nonLandCount = nonLandEntries.reduce((n, c) => n + c.count, 0);
  outputs.deck_average_cmc =
    nonLandCount === 0
      ? 0
      : nonLandEntries.reduce((sum, c) => sum + c.count * manaCostCmc(c.card.manaCost), 0) /
        nonLandCount;

  const totalSimulations = sim.hands.length;
  outputs.observations_report = buildObservationsReport({
    cards: nonLandWithObs.map((row) => ({
      name: row.card.name,
      mana_cost: row.card.mana_cost_string,
      image_uri: row.card.image_uri,
      kind: row.card.kind,
      turn: row.card.turn,
      copies: row.card_count,
      cmc: row.cmc,
      observations: row.observations,
    })),
    total_simulations: totalSimulations,
    accumulated_opening_hand_size: sim.accumulatedOpeningHandSize,
    accumulated_opening_hand_land_count: sim.accumulatedOpeningHandLandCount,
    deck_size: deckLen,
    deck_average_cmc: outputs.deck_average_cmc,
  });

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
 * Input/Output field names match the mtgoncurve.com contract (snake_case).
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
 */
export async function runAsync(input: RunAsyncInput): Promise<RunOutput> {
  const { deck, simConfig, nonLandCards } = prepareRun(input);
  const sim = await simulationFromConfigAsync(simConfig, {
    batchSize: input.batch_size,
    onProgress: input.on_progress,
    cards: nonLandCards,
    signal: input.signal,
  });
  return simulationToOutput(deck, sim);
}
