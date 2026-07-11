/**
 * Synchronous worker-thread sharding for Monte Carlo hand generation.
 * Workers write JSON hands to temp files and signal completion via SharedArrayBuffer.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { Card } from './card/index.js';
import type { Hand } from './hand.js';

export type ParallelHandRequest = {
  runCount: number;
  drawCount: number;
  deck: Card[];
  seed?: number;
  startingHandSize: number;
  mulliganDownTo: number;
  mulliganOnLands: number[];
  acceptableHandList: number[][];
  workers: number;
};

export type WorkerShardPayload = {
  outFile: string;
  statusIndex: number;
  sab: SharedArrayBuffer;
  runCount: number;
  drawCount: number;
  deck: Card[];
  seed: number;
  startingHandSize: number;
  mulliganDownTo: number;
  mulliganOnLands: number[];
  acceptableHandList: number[][];
};

function createShardWorker(payload: WorkerShardPayload): Worker {
  const fromSrc = /[/\\]src[/\\]/.test(fileURLToPath(import.meta.url));
  if (fromSrc) {
    return new Worker(new URL('./simulation-worker.ts', import.meta.url), {
      workerData: payload,
      execArgv: ['--import', 'tsx'],
    });
  }
  return new Worker(new URL('./simulation-worker.js', import.meta.url), {
    workerData: payload,
  });
}

export function generateHandsParallelSync(req: ParallelHandRequest): Hand[] {
  const nWorkers = Math.max(1, Math.min(req.workers, req.runCount));
  const dir = mkdtempSync(join(tmpdir(), 'landlord-hands-'));
  const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * nWorkers);
  const statuses = new Int32Array(sab);
  const workers: Worker[] = [];
  const baseSeed = req.seed ?? (Math.random() * 0xffffffff) >>> 0;

  try {
    let remaining = req.runCount;
    let offset = 0;
    for (let i = 0; i < nWorkers; i++) {
      const shard = Math.floor(remaining / (nWorkers - i));
      remaining -= shard;
      const outFile = join(dir, `shard-${i}.json`);
      const seed = (baseSeed + offset * 0x9e3779b9) >>> 0;
      offset += shard;
      const payload: WorkerShardPayload = {
        outFile,
        statusIndex: i,
        sab,
        runCount: shard,
        drawCount: req.drawCount,
        deck: req.deck,
        seed,
        startingHandSize: req.startingHandSize,
        mulliganDownTo: req.mulliganDownTo,
        mulliganOnLands: req.mulliganOnLands,
        acceptableHandList: req.acceptableHandList,
      };
      const worker = createShardWorker(payload);
      workers.push(worker);
      worker.on('error', () => {
        Atomics.store(statuses, i, -1);
        Atomics.notify(statuses, i);
      });
    }

    for (let i = 0; i < nWorkers; i++) {
      while (Atomics.load(statuses, i) === 0) {
        Atomics.wait(statuses, i, 0, 50);
      }
      if (Atomics.load(statuses, i) < 0) {
        throw new Error(`worker shard ${i} failed`);
      }
    }

    const hands: Hand[] = [];
    for (let i = 0; i < nWorkers; i++) {
      const text = readFileSync(join(dir, `shard-${i}.json`), 'utf8');
      const shardHands = JSON.parse(text) as Hand[];
      hands.push(...shardHands);
    }
    return hands;
  } finally {
    for (const w of workers) {
      void w.terminate();
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
