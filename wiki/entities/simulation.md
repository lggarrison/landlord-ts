---
type: entity
title: Simulation
last_updated: 2026-07-11T01:20:00Z
tags: [simulation, src]
related:
  [
    concepts/monte-carlo-simulation.md,
    concepts/streaming-progress.md,
    entities/hand.md,
    entities/run.md,
  ]
status: active
summary: Monte Carlo hand generation and per-card observations; optional parallel, early-stop, async batches.
code_refs: [src/simulation.ts, src/parallel.ts, src/simulation-worker.ts]
---

# Simulation

Runs N seeded (optional) hands, then aggregates `Observations` (`mana`, `cmc`, `play`, `p_mana_given_cmc`). Supports worker-thread sharding, Wilson early-stopping via `epsilon`, and `simulationFromConfigAsync` for progress-aware sequential batches.

## See also

- [Monte Carlo simulation](../concepts/monte-carlo-simulation.md)
- [Streaming progress](../concepts/streaming-progress.md)
- [Hand](hand.md)
- [Run](run.md)
