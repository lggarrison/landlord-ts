---
type: entity
title: Simulation
last_updated: 2026-07-11T00:35:02Z
tags: [simulation, src]
related: [concepts/monte-carlo-simulation.md, entities/hand.md, entities/run.md]
status: active
summary: Monte Carlo hand generation and per-card observations; optional parallel workers and early-stop.
code_refs: [src/simulation.ts, src/parallel.ts, src/simulation-worker.ts]
---

# Simulation

Runs N seeded (optional) hands, then aggregates `Observations` (`mana`, `cmc`, `play`, `p_mana_given_cmc`). Supports worker-thread sharding and Wilson early-stopping via `epsilon`.

## See also

- [Monte Carlo simulation](../concepts/monte-carlo-simulation.md)
- [Hand](hand.md)
- [Run](run.md)
