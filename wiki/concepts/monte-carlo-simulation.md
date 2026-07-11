---
type: concept
title: Monte Carlo simulation
last_updated: 2026-07-11T03:54:00Z
tags: [simulation]
related:
  [
    entities/simulation.md,
    concepts/auto-tap.md,
    concepts/streaming-progress.md,
    concepts/landlord-ts-api.md,
  ]
status: active
summary: N shuffled hands with optional seed, worker parallelization, epsilon early-stop, and async batches.
code_refs: [src/simulation.ts, src/parallel.ts, src/simulation-worker.ts]
---

# Monte Carlo simulation

Each run: mulligan → draws through max card turn → auto-tap per non-land. Key metric on `RunOutput`: `pManaGivenCmc` (`mana / cmc` from internal observations).

Optional `epsilon` treats `runs` as a max and stops when the Wilson half-width of aggregate mana/CMC is tight. Optional `parallel` shards hand generation across `worker_threads` (auto when `runs >= 2000` and no seed; seeded runs stay single-threaded for reproducibility).

`simulationFromConfigAsync` / [`runAsync`](landlord-ts-api.md) generate hands in sequential batches with optional progress callbacks for streaming hosts — see [Streaming progress](streaming-progress.md).

## See also

- [Simulation](../entities/simulation.md)
- [Auto-tap](auto-tap.md)
- [Streaming progress](streaming-progress.md)
- [landlord-ts API](landlord-ts-api.md)
