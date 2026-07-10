/**
 * Simulation hands and auto-tap — port of hand.rs + TapLand delay from feat/enters-tapped-lands.
 */
import { maximumBipartiteMatching } from "./bipartite.js";
import {
  CardKind,
  isLandKind,
  emptyManaCost,
  type Card,
  type ManaCost,
} from "./card/index.js";
import type { Mulligan, Rng } from "./mulligan/types.js";

export type SimCard = {
  hash: number;
  kind: CardKind;
  manaCost: ManaCost;
};

export function newSimCard(): SimCard {
  return { hash: 0, kind: CardKind.Unknown, manaCost: emptyManaCost() };
}

export function simCardFromCard(card: Card): SimCard {
  return { hash: card.hash, kind: card.kind, manaCost: { ...card.manaCost } };
}

export enum PlayOrder {
  First = "First",
  Second = "Second",
}

export type AutoTapResult = {
  paid: boolean;
  cmc: boolean;
  inOpeningHand: boolean;
  inDrawHand: boolean;
};

export function newAutoTapResult(): AutoTapResult {
  return { paid: false, cmc: false, inOpeningHand: false, inDrawHand: false };
}

export type Scratch = {
  lands: SimCard[];
  edges: number[];
  seen: boolean[];
  matches: number[];
};

export function newScratch(maxLandCount: number, maxPipCount: number): Scratch {
  return {
    lands: [],
    edges: new Array(maxLandCount * maxPipCount).fill(0),
    seen: new Array(maxLandCount).fill(false),
    matches: new Array(maxLandCount).fill(-1),
  };
}

function taplandTapsOnTurn(playTurn: number): number {
  return playTurn + 1;
}

export type Hand = {
  cards: SimCard[];
  startingHandSize: number;
  openingHandSize: number;
  mulliganCount: number;
};

export function handFromOpeningAndDraws(
  opening: readonly Card[],
  draws: readonly Card[],
): Hand {
  const cards: SimCard[] = [];
  for (const card of opening) cards.push(simCardFromCard(card));
  for (const card of draws) cards.push(simCardFromCard(card));
  const startingHandSize = 7;
  const openingHandSize = opening.length;
  return {
    cards,
    startingHandSize,
    openingHandSize,
    mulliganCount: startingHandSize - openingHandSize,
  };
}

export function handFromMulligan(
  mulligan: Mulligan,
  rng: Rng,
  deck: readonly Card[],
  draws: number,
): Hand {
  return mulligan.simulateHand(rng, deck, draws);
}

export function handOpening(hand: Hand): SimCard[] {
  return hand.cards.slice(0, hand.openingHandSize);
}

export function handDraws(hand: Hand, drawCount: number): SimCard[] {
  return hand.cards.slice(
    hand.openingHandSize,
    hand.openingHandSize + drawCount,
  );
}

export function handOpeningWithDraws(hand: Hand, drawCount: number): SimCard[] {
  return hand.cards.slice(0, hand.openingHandSize + drawCount);
}

export function countInOpeningWithDraws(
  hand: Hand,
  drawCount: number,
  predicate: (card: SimCard) => boolean,
): number {
  let count = 0;
  for (const card of handOpeningWithDraws(hand, drawCount)) {
    if (predicate(card)) count += 1;
  }
  return count;
}

export function autoTapByTurn(
  hand: Hand,
  goal: Card,
  turn: number,
  playOrder: PlayOrder,
): AutoTapResult {
  const scratch = newScratch(30, 8);
  return autoTapWithScratch(hand, simCardFromCard(goal), turn, playOrder, scratch);
}

export function playCmcAutoTap(hand: Hand, goal: Card): AutoTapResult {
  return autoTapByTurn(hand, goal, Math.max(1, goal.turn), PlayOrder.First);
}

export function drawCmcAutoTap(hand: Hand, goal: Card): AutoTapResult {
  return autoTapByTurn(hand, goal, Math.max(1, goal.turn), PlayOrder.Second);
}

/**
 * TapLand-only delay: available when playTurn+1 <= goal turn.
 * Check/Shock/other lands are immediately available.
 */
export function autoTapWithScratch(
  hand: Hand,
  goal: SimCard,
  turn: number,
  playOrder: PlayOrder,
  scratch: Scratch,
): AutoTapResult {
  const drawCount = playOrder === PlayOrder.First ? turn - 1 : turn;
  const openingHand = handOpening(hand);
  const drawn = handDraws(hand, drawCount);

  scratch.lands.length = 0;

  let inOpeningHand = false;
  let openingTaplandPlayTurn = 0;
  for (const card of openingHand) {
    if (card.kind === CardKind.TapLand) {
      openingTaplandPlayTurn += 1;
      if (taplandTapsOnTurn(openingTaplandPlayTurn) <= turn) {
        scratch.lands.push(card);
      }
    } else if (isLandKind(card.kind)) {
      scratch.lands.push(card);
    }
    if (card.hash === goal.hash) inOpeningHand = true;
  }

  let inDrawHand = false;
  for (let drawIdx = 0; drawIdx < drawn.length; drawIdx++) {
    const card = drawn[drawIdx]!;
    if (card.kind === CardKind.TapLand) {
      const playTurn =
        playOrder === PlayOrder.First ? drawIdx + 2 : drawIdx + 1;
      if (taplandTapsOnTurn(playTurn) <= turn) {
        scratch.lands.push(card);
      }
    } else if (isLandKind(card.kind)) {
      scratch.lands.push(card);
    }
    if (card.hash === goal.hash) inDrawHand = true;
  }

  const pipCount =
    goal.manaCost.r +
    goal.manaCost.g +
    goal.manaCost.b +
    goal.manaCost.u +
    goal.manaCost.w +
    goal.manaCost.c;
  const landCount = scratch.lands.length;

  if (landCount < pipCount) {
    return { paid: false, cmc: false, inOpeningHand, inDrawHand };
  }

  const edgeLen = pipCount * landCount;
  if (scratch.edges.length !== edgeLen) {
    scratch.edges = new Array(edgeLen).fill(0);
  } else {
    scratch.edges.fill(0);
  }
  if (scratch.seen.length !== landCount) {
    scratch.seen = new Array(landCount).fill(false);
  }
  if (scratch.matches.length !== landCount) {
    scratch.matches = new Array(landCount).fill(-1);
  }

  let row = 0;
  for (let m = 0; m < goal.manaCost.r; m++, row++) {
    for (let n = 0; n < landCount; n++) {
      scratch.edges[landCount * row + n] = scratch.lands[n]!.manaCost.r;
    }
  }
  for (let m = 0; m < goal.manaCost.g; m++, row++) {
    for (let n = 0; n < landCount; n++) {
      scratch.edges[landCount * row + n] = scratch.lands[n]!.manaCost.g;
    }
  }
  for (let m = 0; m < goal.manaCost.b; m++, row++) {
    for (let n = 0; n < landCount; n++) {
      scratch.edges[landCount * row + n] = scratch.lands[n]!.manaCost.b;
    }
  }
  for (let m = 0; m < goal.manaCost.u; m++, row++) {
    for (let n = 0; n < landCount; n++) {
      scratch.edges[landCount * row + n] = scratch.lands[n]!.manaCost.u;
    }
  }
  for (let m = 0; m < goal.manaCost.w; m++, row++) {
    for (let n = 0; n < landCount; n++) {
      scratch.edges[landCount * row + n] = scratch.lands[n]!.manaCost.w;
    }
  }
  for (let m = 0; m < goal.manaCost.c; m++, row++) {
    for (let n = 0; n < landCount; n++) {
      scratch.edges[landCount * row + n] = 1;
    }
  }

  const pipsPaid = maximumBipartiteMatching(
    scratch.edges,
    pipCount,
    landCount,
    scratch.seen,
    scratch.matches,
  );

  return {
    paid: pipsPaid === pipCount,
    cmc: true,
    inOpeningHand,
    inDrawHand,
  };
}
