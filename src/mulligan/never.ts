import type { Card } from '../card/index.js';
import { handFromOpeningAndDraws, type Hand } from '../hand.js';
import { partialShuffle, type Mulligan, type Rng } from './types.js';

export const STARTING_HAND_SIZE = 7;

export type Never = {
  startingHandSize: number;
};

export function newNever(): Never {
  return { startingHandSize: STARTING_HAND_SIZE };
}

export function neverSimulateHand(
  self: Never,
  rng: Rng,
  deck: readonly Card[],
  draws: number,
): Hand {
  const deckLen = deck.length;
  const cardsToDraw = Math.min(deckLen, self.startingHandSize + draws);
  const startingHandSize = Math.min(deckLen, self.startingHandSize);
  const indexRange = Array.from({ length: deckLen }, (_, i) => i);
  const shuffledIndices = partialShuffle(indexRange, rng, cardsToDraw);
  const shuffledDeck = shuffledIndices.map((i) => deck[i]!);
  return handFromOpeningAndDraws(
    shuffledDeck.slice(0, startingHandSize),
    shuffledDeck.slice(startingHandSize),
    startingHandSize,
  );
}

export function asNeverMulligan(n: Never = newNever()): Mulligan {
  return {
    simulateHand: (rng, deck, draws) => neverSimulateHand(n, rng, deck, draws),
  };
}
