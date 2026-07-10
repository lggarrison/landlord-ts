---
type: concept
title: Monte Carlo simulation
last_updated: 2026-07-10T19:45:00Z
tags: [simulation]
related: [entities/simulation.md, concepts/auto-tap.md]
status: active
summary: N shuffled hands with optional seed, worker parallelization, and epsilon early-stop.
code_refs: [src/simulation.ts, src/parallel.ts, src/simulation-worker.ts]
---

# Monte Carlo simulation

Each run: mulligan → draws through max card turn → auto-tap per non-land. Key metric: `p_mana_given_cmc = mana / cmc`.

Optional `epsilon` treats `runs` as a max and stops when the Wilson half-width of aggregate mana/CMC is tight. Optional `parallel` shards hand generation across `worker_threads` (auto when `runs >= 2000` and no seed; seeded runs stay single-threaded for reproducibility).

## See also

- [Simulation](../entities/simulation.md)
- [Auto-tap](auto-tap.md)
