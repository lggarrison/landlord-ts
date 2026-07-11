/**
 * On-curve observations report builders — used to populate flattened RunOutput.
 */
import type { CardKind } from './card/index.js';
import type { Observations } from './simulation.js';
import { pManaGivenCmc, pPlay } from './simulation.js';

/** Fraction of CMC opportunities that must fail color/timing to flag `colorConstrained`. */
export const COLOR_CONSTRAINED_THRESHOLD = 0.15;
/** Fraction of mana hits that must be undrawn to flag `drawDependent`. */
export const DRAW_DEPENDENT_THRESHOLD = 0.15;

export type CardObservationsReport = {
  name: string;
  manaCost: string;
  imageUri: string;
  kind: CardKind;
  turn: number;
  copies: number;
  cmc: number;
  playedOnCurve: number;
  notPlayedOnCurve: number;
  totalSimulations: number;
  pCastOnCurve: number;
  pManaGivenCmc: number;
  pInOpeningHand: number;
  notEnoughLands: number;
  colorOrTimingFail: number;
  manaOkUndrawn: number;
};

export type WeakestOnCurveEntry = {
  name: string;
  pCastOnCurve: number;
  turn: number;
};

export type ColorConstrainedEntry = {
  name: string;
  colorOrTimingFail: number;
  cmcOpportunities: number;
};

export type DrawDependentEntry = {
  name: string;
  manaOkUndrawn: number;
  manaHits: number;
};

/** Internal builder result; fields are flattened onto `RunOutput` by `run()`. */
export type ObservationsReport = {
  totalSimulations: number;
  avgOpeningHandSize: number;
  avgOpeningLandCount: number;
  deckSize: number;
  deckAverageCmc: number;
  cards: CardObservationsReport[];
  weakestOnCurve: WeakestOnCurveEntry[];
  colorConstrained: ColorConstrainedEntry[];
  drawDependent: DrawDependentEntry[];
};

export type CardReportInput = {
  name: string;
  manaCost: string;
  imageUri: string;
  kind: CardKind;
  turn: number;
  copies: number;
  cmc: number;
  observations: Observations;
};

export type BuildObservationsReportInput = {
  cards: readonly CardReportInput[];
  totalSimulations: number;
  accumulatedOpeningHandSize: number;
  accumulatedOpeningHandLandCount: number;
  deckSize: number;
  deckAverageCmc: number;
};

export function emptyObservationsReport(): ObservationsReport {
  return {
    totalSimulations: 0,
    avgOpeningHandSize: 0,
    avgOpeningLandCount: 0,
    deckSize: 0,
    deckAverageCmc: 0,
    cards: [],
    weakestOnCurve: [],
    colorConstrained: [],
    drawDependent: [],
  };
}

function cardReportFromInput(input: CardReportInput): CardObservationsReport {
  const { observations: o } = input;
  const total = o.totalRuns;
  const played = o.play;
  return {
    name: input.name,
    manaCost: input.manaCost,
    imageUri: input.imageUri,
    kind: input.kind,
    turn: input.turn,
    copies: input.copies,
    cmc: input.cmc,
    playedOnCurve: played,
    notPlayedOnCurve: total - played,
    totalSimulations: total,
    pCastOnCurve: pPlay(o),
    pManaGivenCmc: pManaGivenCmc(o),
    pInOpeningHand: total === 0 ? 0 : o.inOpeningHand / total,
    notEnoughLands: total - o.cmc,
    colorOrTimingFail: o.cmc - o.mana,
    manaOkUndrawn: o.mana - o.play,
  };
}

function compareCardsByCmcThenName(a: CardObservationsReport, b: CardObservationsReport): number {
  return a.cmc - b.cmc || a.name.localeCompare(b.name);
}

export function buildObservationsReport(input: BuildObservationsReportInput): ObservationsReport {
  const total = input.totalSimulations;
  const cards = input.cards.map(cardReportFromInput);
  cards.sort(compareCardsByCmcThenName);

  const weakestOnCurve: WeakestOnCurveEntry[] = cards
    .map((c) => ({
      name: c.name,
      pCastOnCurve: c.pCastOnCurve,
      turn: c.turn,
    }))
    .sort((a, b) => a.pCastOnCurve - b.pCastOnCurve);

  const colorConstrained: ColorConstrainedEntry[] = [];
  const drawDependent: DrawDependentEntry[] = [];
  for (const inputCard of input.cards) {
    const o = inputCard.observations;
    if (o.cmc > 0 && (o.cmc - o.mana) / o.cmc >= COLOR_CONSTRAINED_THRESHOLD) {
      colorConstrained.push({
        name: inputCard.name,
        colorOrTimingFail: o.cmc - o.mana,
        cmcOpportunities: o.cmc,
      });
    }
    if (o.mana > 0 && (o.mana - o.play) / o.mana >= DRAW_DEPENDENT_THRESHOLD) {
      drawDependent.push({
        name: inputCard.name,
        manaOkUndrawn: o.mana - o.play,
        manaHits: o.mana,
      });
    }
  }
  colorConstrained.sort(
    (a, b) => b.colorOrTimingFail / b.cmcOpportunities - a.colorOrTimingFail / a.cmcOpportunities,
  );
  drawDependent.sort((a, b) => b.manaOkUndrawn / b.manaHits - a.manaOkUndrawn / a.manaHits);

  return {
    totalSimulations: total,
    avgOpeningHandSize: total === 0 ? 0 : input.accumulatedOpeningHandSize / total,
    avgOpeningLandCount: total === 0 ? 0 : input.accumulatedOpeningHandLandCount / total,
    deckSize: input.deckSize,
    deckAverageCmc: input.deckAverageCmc,
    cards,
    weakestOnCurve,
    colorConstrained,
    drawDependent,
  };
}
