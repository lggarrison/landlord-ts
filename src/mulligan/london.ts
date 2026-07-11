import { isLand, isLandKind, type Card } from '../card/index.js';
import { handFromOpeningAndDraws, type Hand } from '../hand.js';
import { partialShuffle, type Mulligan, type Rng } from './types.js';

export const STARTING_HAND_SIZE = 7;

export type London = {
  startingHandSize: number;
  mulliganDownTo: number;
  mulliganOnLands: Set<number>;
  acceptableHandList: Set<number>[];
};

export function londonNever(): London {
  return {
    startingHandSize: STARTING_HAND_SIZE,
    mulliganDownTo: STARTING_HAND_SIZE,
    mulliganOnLands: new Set(),
    acceptableHandList: [],
  };
}

export function londonAlways(downTo: number): London {
  const mulliganOnLands = new Set<number>();
  for (let i = 0; i <= STARTING_HAND_SIZE; i++) mulliganOnLands.add(i);
  return {
    startingHandSize: STARTING_HAND_SIZE,
    mulliganDownTo: downTo,
    mulliganOnLands,
    acceptableHandList: [],
  };
}

export function londonSimulateHand(
  self: London,
  rng: Rng,
  deck: readonly Card[],
  draws: number,
): Hand {
  const deckSize = deck.length;
  const startingHandSize = Math.min(self.startingHandSize, deckSize);
  const mulliganDownTo = Math.min(self.mulliganDownTo, startingHandSize);
  const maxMulliganRounds = startingHandSize - mulliganDownTo + 1;
  const cardsToDraw = Math.min(startingHandSize + draws + maxMulliganRounds, deckSize);

  const indexRange = Array.from({ length: deckSize }, (_, i) => i);
  const mustKeepCardIndices: number[] = [];
  const seenCardHashes = new Set<number>();

  for (let round = 0; round < maxMulliganRounds; round++) {
    const shuffledIndices = partialShuffle(indexRange.slice(), rng, cardsToDraw);
    const shuffledDeck = shuffledIndices.map((i) => deck[i]!);
    const startingHand = shuffledDeck.slice(0, startingHandSize);
    const isLastRound = round === maxMulliganRounds - 1;

    let landCount = 0;
    for (const c of startingHand) {
      if (isLand(c)) landCount += 1;
    }
    const sufficientLandCount = !self.mulliganOnLands.has(landCount);

    if (!isLastRound && !sufficientLandCount) continue;

    let foundAcceptableHand = false;
    for (const acceptableHand of self.acceptableHandList) {
      mustKeepCardIndices.length = 0;
      seenCardHashes.clear();
      for (let i = 0; i < startingHand.length; i++) {
        const card = startingHand[i]!;
        if (seenCardHashes.has(card.hash)) continue;
        if (acceptableHand.has(card.hash)) mustKeepCardIndices.push(i);
        seenCardHashes.add(card.hash);
      }
      foundAcceptableHand = mustKeepCardIndices.length === acceptableHand.size;
      if (foundAcceptableHand) break;
    }

    const disregardFoundAcceptableHand = self.acceptableHandList.length === 0;
    const keep =
      isLastRound || (sufficientLandCount && (disregardFoundAcceptableHand || foundAcceptableHand));

    if (!keep) continue;

    const openingHandSize = startingHandSize - round;
    let landsSaved = 0;
    for (let i = 0; i < startingHand.length; i++) {
      const card = startingHand[i]!;
      if (!isLandKind(card.kind)) continue;
      const needMoreLands = self.mulliganOnLands.has(landsSaved) && landsSaved < openingHandSize;
      if (needMoreLands) {
        mustKeepCardIndices.push(i);
        landsSaved += 1;
      } else {
        break;
      }
    }

    mustKeepCardIndices.sort((a, b) => a - b);
    {
      let w = 0;
      for (let r = 0; r < mustKeepCardIndices.length; r++) {
        if (r === 0 || mustKeepCardIndices[r] !== mustKeepCardIndices[r - 1]) {
          mustKeepCardIndices[w++] = mustKeepCardIndices[r]!;
        }
      }
      mustKeepCardIndices.length = w;
    }

    for (let i = 0; i < mustKeepCardIndices.length; i++) {
      const mustKeepI = mustKeepCardIndices[i]!;
      const tmp = shuffledDeck[i]!;
      shuffledDeck[i] = shuffledDeck[mustKeepI]!;
      shuffledDeck[mustKeepI] = tmp;
    }

    let discardCount = 0;
    for (let i = openingHandSize; i < startingHandSize; i++) {
      const j = cardsToDraw - 1 - discardCount;
      const tmp = shuffledDeck[i]!;
      shuffledDeck[i] = shuffledDeck[j]!;
      shuffledDeck[j] = tmp;
      discardCount += 1;
    }

    return handFromOpeningAndDraws(
      shuffledDeck.slice(0, openingHandSize),
      shuffledDeck.slice(openingHandSize),
      startingHandSize,
    );
  }

  // Defensive fallback: keep a full opening hand from a fresh shuffle.
  const shuffledIndices = partialShuffle(indexRange.slice(), rng, cardsToDraw);
  const shuffledDeck = shuffledIndices.map((i) => deck[i]!);
  return handFromOpeningAndDraws(
    shuffledDeck.slice(0, startingHandSize),
    shuffledDeck.slice(startingHandSize),
    startingHandSize,
  );
}

export function asLondonMulligan(london: London): Mulligan {
  return {
    simulateHand: (rng, deck, draws) => londonSimulateHand(london, rng, deck, draws),
  };
}
