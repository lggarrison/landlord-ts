import type { Card } from '../card/index.js';
import type { Hand } from '../hand.js';

export type Rng = {
  /** Uniform integer in `[min, max)`. */
  genRange(min: number, max: number): number;
};

export type Mulligan = {
  simulateHand(rng: Rng, deck: readonly Card[], draws: number): Hand;
};

/** Mulberry32 PRNG for reproducible simulations. */
export function createMulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return {
    genRange(min: number, max: number): number {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      const u = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      return min + Math.floor(u * (max - min));
    },
  };
}

/** Entropy-seeded RNG (non-reproducible). */
export function createEntropyRng(): Rng {
  return createMulberry32((Math.random() * 0xffffffff) >>> 0);
}

/**
 * Fisher–Yates partial shuffle matching rand::SliceRandom::partial_shuffle:
 * places `amount` randomly chosen elements at the front; returns that prefix.
 */
export function partialShuffle<T>(slice: T[], rng: Rng, amount: number): T[] {
  const n = Math.min(amount, slice.length);
  for (let i = 0; i < n; i++) {
    const j = rng.genRange(i, slice.length);
    const tmp = slice[i]!;
    slice[i] = slice[j]!;
    slice[j] = tmp;
  }
  return slice.slice(0, n);
}
