---
type: entity
title: Run
last_updated: 2026-07-10T19:45:00Z
tags: [src, run]
related: [concepts/mtgoncurve-api.md, entities/src.md]
status: active
summary: Public run() façade matching mtgoncurve Input/Output.
code_refs: [src/run.ts, src/index.ts]
---

# Run

`run(input)` parses a decklist, configures London mulligan, simulates, and returns snake_case output (`card_observations`, land-type mana counts including fast/slow/turn, etc.).

Optional inputs: `starting_hand_size`, `epsilon` (early-stop), `parallel`, `seed`.

## See also

- [mtgoncurve API](../concepts/mtgoncurve-api.md)
- [Src](src.md)
