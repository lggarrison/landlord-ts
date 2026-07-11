/**
 * User-facing observations report — separate from mtgoncurve `card_observations`.
 */
import type { CardKind } from './card/index.js';
import type { Observations } from './simulation.js';
import { pManaGivenCmc, pPlay } from './simulation.js';

const COLOR_CONSTRAINED_THRESHOLD = 0.15;
const DRAW_DEPENDENT_THRESHOLD = 0.15;

export type CardObservationsReport = {
  name: string;
  mana_cost: string;
  image_uri: string;
  kind: CardKind;
  turn: number;
  copies: number;
  cmc: number;
  played_on_curve: number;
  not_played_on_curve: number;
  total_simulations: number;
  p_cast_on_curve: number;
  p_mana_given_cmc: number;
  p_in_opening_hand: number;
  not_enough_lands: number;
  color_or_timing_fail: number;
  mana_ok_undrawn: number;
};

export type WeakestOnCurveEntry = {
  name: string;
  p_cast_on_curve: number;
  turn: number;
};

export type ColorConstrainedEntry = {
  name: string;
  color_or_timing_fail: number;
  cmc_opportunities: number;
};

export type DrawDependentEntry = {
  name: string;
  mana_ok_undrawn: number;
  mana_hits: number;
};

export type ObservationsReport = {
  total_simulations: number;
  avg_opening_hand_size: number;
  avg_opening_land_count: number;
  deck_size: number;
  deck_average_cmc: number;
  cards: CardObservationsReport[];
  weakest_on_curve: WeakestOnCurveEntry[];
  color_constrained: ColorConstrainedEntry[];
  draw_dependent: DrawDependentEntry[];
};

export type CardReportInput = {
  name: string;
  mana_cost: string;
  image_uri: string;
  kind: CardKind;
  turn: number;
  copies: number;
  cmc: number;
  observations: Observations;
};

export type BuildObservationsReportInput = {
  cards: readonly CardReportInput[];
  total_simulations: number;
  accumulated_opening_hand_size: number;
  accumulated_opening_hand_land_count: number;
  deck_size: number;
  deck_average_cmc: number;
};

export function emptyObservationsReport(): ObservationsReport {
  return {
    total_simulations: 0,
    avg_opening_hand_size: 0,
    avg_opening_land_count: 0,
    deck_size: 0,
    deck_average_cmc: 0,
    cards: [],
    weakest_on_curve: [],
    color_constrained: [],
    draw_dependent: [],
  };
}

function cardReportFromInput(input: CardReportInput): CardObservationsReport {
  const { observations: o } = input;
  const total = o.totalRuns;
  const played = o.play;
  return {
    name: input.name,
    mana_cost: input.mana_cost,
    image_uri: input.image_uri,
    kind: input.kind,
    turn: input.turn,
    copies: input.copies,
    cmc: input.cmc,
    played_on_curve: played,
    not_played_on_curve: total - played,
    total_simulations: total,
    p_cast_on_curve: pPlay(o),
    p_mana_given_cmc: pManaGivenCmc(o),
    p_in_opening_hand: total === 0 ? 0 : o.inOpeningHand / total,
    not_enough_lands: total - o.cmc,
    color_or_timing_fail: o.cmc - o.mana,
    mana_ok_undrawn: o.mana - o.play,
  };
}

export function buildObservationsReport(input: BuildObservationsReportInput): ObservationsReport {
  const total = input.total_simulations;
  const cards = input.cards.map(cardReportFromInput);
  cards.sort((a, b) => a.name.localeCompare(b.name));
  cards.sort((a, b) => a.cmc - b.cmc);

  const weakest_on_curve: WeakestOnCurveEntry[] = cards
    .map((c) => ({
      name: c.name,
      p_cast_on_curve: c.p_cast_on_curve,
      turn: c.turn,
    }))
    .sort((a, b) => a.p_cast_on_curve - b.p_cast_on_curve);

  const color_constrained: ColorConstrainedEntry[] = [];
  const draw_dependent: DrawDependentEntry[] = [];
  for (const inputCard of input.cards) {
    const o = inputCard.observations;
    if (o.cmc > 0 && (o.cmc - o.mana) / o.cmc >= COLOR_CONSTRAINED_THRESHOLD) {
      color_constrained.push({
        name: inputCard.name,
        color_or_timing_fail: o.cmc - o.mana,
        cmc_opportunities: o.cmc,
      });
    }
    if (o.mana > 0 && (o.mana - o.play) / o.mana >= DRAW_DEPENDENT_THRESHOLD) {
      draw_dependent.push({
        name: inputCard.name,
        mana_ok_undrawn: o.mana - o.play,
        mana_hits: o.mana,
      });
    }
  }
  color_constrained.sort(
    (a, b) =>
      b.color_or_timing_fail / b.cmc_opportunities - a.color_or_timing_fail / a.cmc_opportunities,
  );
  draw_dependent.sort((a, b) => b.mana_ok_undrawn / b.mana_hits - a.mana_ok_undrawn / a.mana_hits);

  return {
    total_simulations: total,
    avg_opening_hand_size: total === 0 ? 0 : input.accumulated_opening_hand_size / total,
    avg_opening_land_count: total === 0 ? 0 : input.accumulated_opening_hand_land_count / total,
    deck_size: input.deck_size,
    deck_average_cmc: input.deck_average_cmc,
    cards,
    weakest_on_curve,
    color_constrained,
    draw_dependent,
  };
}
