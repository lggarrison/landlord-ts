/**
 * Worker entry: generate a shard of mulligan hands and write them to disk.
 */
import { writeFileSync } from 'node:fs';
import { workerData } from 'node:worker_threads';
import type { Card } from './card/index.js';
import { handFromMulligan } from './hand.js';
import { asLondonMulligan, londonNever } from './mulligan/index.js';
import { createMulberry32 } from './mulligan/types.js';
import type { WorkerShardPayload } from './parallel.js';

const payload = workerData as WorkerShardPayload;

try {
  const london = londonNever();
  london.startingHandSize = payload.startingHandSize;
  london.mulliganDownTo = payload.mulliganDownTo;
  london.mulliganOnLands = new Set(payload.mulliganOnLands);
  london.acceptableHandList = payload.acceptableHandList.map((row) => new Set(row));

  const mulligan = asLondonMulligan(london);
  const rng = createMulberry32(payload.seed);
  const deck = payload.deck as Card[];
  const hands = [];
  for (let i = 0; i < payload.runCount; i++) {
    hands.push(handFromMulligan(mulligan, rng, deck, payload.drawCount));
  }
  writeFileSync(payload.outFile, JSON.stringify(hands));
  const statuses = new Int32Array(payload.sab);
  Atomics.store(statuses, payload.statusIndex, 1);
  Atomics.notify(statuses, payload.statusIndex);
} catch {
  const statuses = new Int32Array(payload.sab);
  Atomics.store(statuses, payload.statusIndex, -1);
  Atomics.notify(statuses, payload.statusIndex);
}
