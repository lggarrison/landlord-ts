---
type: concept
title: Monte Carlo simulation
last_updated: 2026-07-10T18:30:00Z
tags: [simulation]
related: [entities/simulation.md, concepts/auto-tap.md]
status: active
summary: N shuffled hands with optional seeded RNG; aggregate on-curve observations.
code_refs: [src/simulation.ts]
---

# Monte Carlo simulation

Each run: mulligan → draws through max card turn → auto-tap per non-land. Key metric: `p_mana_given_cmc = mana / cmc`.

## See also

- [Simulation](../entities/simulation.md)
- [Auto-tap](auto-tap.md)
