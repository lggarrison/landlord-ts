---
type: entity
title: Simulation
last_updated: 2026-07-10T18:30:00Z
tags: [src, simulation]
related: [concepts/monte-carlo-simulation.md, entities/hand.md, entities/run.md]
status: active
summary: Monte Carlo hand generation and per-card observations.
code_refs: [src/simulation.ts]
---

# Simulation

Runs N seeded (optional) hands, then aggregates `Observations` (`mana`, `cmc`, `play`, `p_mana_given_cmc`).

## See also

- [Monte Carlo simulation](../concepts/monte-carlo-simulation.md)
- [Hand](hand.md)
- [Run](run.md)
