/**
 * Simulation hands and auto-tap — board-aware ETB for Tap/Check/Fast/Slow/Turn lands.
 */
import { maximumBipartiteMatching } from './bipartite.js';
import { CardKind, isLandKind, emptyManaCost, type Card, type ManaCost } from './card/index.js';
import type { Mulligan, Rng } from './mulligan/types.js';

export type SimCard = {
  hash: number;
  kind: CardKind;
  manaCost: ManaCost;
  basicLandTypes: number;
  checkTypes: number;
};

export function newSimCard(): SimCard {
  return {
    hash: 0,
    kind: CardKind.Unknown,
    manaCost: emptyManaCost(),
    basicLandTypes: 0,
    checkTypes: 0,
  };
}

export function simCardFromCard(card: Card): SimCard {
  return {
    hash: card.hash,
    kind: card.kind,
    manaCost: { ...card.manaCost },
    basicLandTypes: card.basicLandTypes ?? 0,
    checkTypes: card.checkTypes ?? 0,
  };
}

export enum PlayOrder {
  First = 'First',
  Second = 'Second',
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

export type Hand = {
  cards: SimCard[];
  startingHandSize: number;
  openingHandSize: number;
  mulliganCount: number;
};

export function handFromOpeningAndDraws(
  opening: readonly Card[],
  draws: readonly Card[],
  startingHandSize = 7,
): Hand {
  const cards: SimCard[] = [];
  for (const card of opening) cards.push(simCardFromCard(card));
  for (const card of draws) cards.push(simCardFromCard(card));
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
  return hand.cards.slice(hand.openingHandSize, hand.openingHandSize + drawCount);
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

function isAlwaysAvailableKind(kind: CardKind): boolean {
  return (
    kind === CardKind.BasicLand ||
    kind === CardKind.OtherLand ||
    kind === CardKind.ForcedLand ||
    kind === CardKind.ShockLand ||
    kind === CardKind.PainLand ||
    kind === CardKind.FetchLand ||
    kind === CardKind.CanopyLand ||
    kind === CardKind.PathwayLand
  );
}

function isConditionalEtbKind(kind: CardKind): boolean {
  return (
    kind === CardKind.TapLand ||
    kind === CardKind.CheckLand ||
    kind === CardKind.FastLand ||
    kind === CardKind.SlowLand ||
    kind === CardKind.BattleLand ||
    kind === CardKind.TurnLand ||
    kind === CardKind.SurveilLand ||
    kind === CardKind.BounceLand ||
    kind === CardKind.TriomeLand ||
    kind === CardKind.CyclingLand
  );
}

/**
 * Available turn for a land given board state when it is played.
 * Always-available kinds ignore play-turn gating for Karsten parity (sources in hand).
 * `basicsOnBoard` counts Basic-supertype lands already played (for BattleLand).
 */
export function availableTurnForLand(
  card: SimCard,
  playTurn: number,
  otherLands: number,
  boardTypes: number,
  basicsOnBoard = 0,
): number {
  switch (card.kind) {
    case CardKind.TapLand:
    case CardKind.SurveilLand:
    case CardKind.BounceLand:
    case CardKind.TriomeLand:
    case CardKind.CyclingLand:
      return playTurn + 1;
    case CardKind.CheckLand: {
      const unlocked = (boardTypes & card.checkTypes) !== 0;
      return unlocked ? playTurn : playTurn + 1;
    }
    case CardKind.FastLand:
      return otherLands <= 2 ? playTurn : playTurn + 1;
    case CardKind.SlowLand:
      return otherLands >= 2 ? playTurn : playTurn + 1;
    case CardKind.BattleLand:
      return basicsOnBoard >= 2 ? playTurn : playTurn + 1;
    case CardKind.TurnLand:
      return playTurn <= 3 ? playTurn : playTurn + 1;
    default:
      return playTurn;
  }
}

/**
 * Assign play turns: earliest legal turn from opening index / draw turn,
 * then one land per turn (max(earliest, lastPlay + 1)).
 */
export function scheduleLandPlays(
  openingHand: readonly SimCard[],
  drawn: readonly SimCard[],
  playOrder: PlayOrder,
): { card: SimCard; playTurn: number }[] {
  const candidates: { card: SimCard; earliest: number }[] = [];
  let openingLandIdx = 0;
  for (const card of openingHand) {
    if (!isLandKind(card.kind)) continue;
    openingLandIdx += 1;
    candidates.push({ card, earliest: openingLandIdx });
  }
  for (let drawIdx = 0; drawIdx < drawn.length; drawIdx++) {
    const card = drawn[drawIdx]!;
    if (!isLandKind(card.kind)) continue;
    const earliest = playOrder === PlayOrder.First ? drawIdx + 2 : drawIdx + 1;
    candidates.push({ card, earliest });
  }

  const scheduled: { card: SimCard; playTurn: number }[] = [];
  let lastPlayTurn = 0;
  for (const { card, earliest } of candidates) {
    const playTurn = Math.max(earliest, lastPlayTurn + 1);
    scheduled.push({ card, playTurn });
    lastPlayTurn = playTurn;
  }
  return scheduled;
}

/**
 * Board-aware auto-tap: calendar play turns + conditional ETB delay.
 * Basics/Other/Forced/Shock/Pain/Fetch/Canopy/Pathway remain available whenever drawn.
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

  let inOpeningHand = false;
  let inDrawHand = false;
  for (const card of openingHand) {
    if (card.hash === goal.hash) inOpeningHand = true;
  }
  for (const card of drawn) {
    if (card.hash === goal.hash) inDrawHand = true;
  }

  const scheduled = scheduleLandPlays(openingHand, drawn, playOrder);

  scratch.lands.length = 0;
  let boardTypes = 0;
  let basicsOnBoard = 0;
  for (let i = 0; i < scheduled.length; i++) {
    const { card, playTurn } = scheduled[i]!;
    const otherLands = i;

    if (isAlwaysAvailableKind(card.kind)) {
      scratch.lands.push(card);
    } else if (isConditionalEtbKind(card.kind)) {
      const availableTurn = availableTurnForLand(
        card,
        playTurn,
        otherLands,
        boardTypes,
        basicsOnBoard,
      );
      if (availableTurn <= turn) scratch.lands.push(card);
    } else {
      scratch.lands.push(card);
    }

    boardTypes |= card.basicLandTypes;
    if (card.kind === CardKind.BasicLand) basicsOnBoard += 1;
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
