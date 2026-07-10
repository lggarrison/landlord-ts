---
type: entity
title: Card
last_updated: 2026-07-10T19:45:00Z
tags: [src, card]
related: [entities/src.md, entities/collection.md]
status: active
summary: Card, CardKind (incl. Fast/Slow/Turn), ManaCost, and land-type bitmasks.
code_refs:
  [
    src/card/index.ts,
    src/card/types.ts,
    src/card/mana-cost.ts,
    src/card/mana-color-count.ts,
    src/card/land-types.ts,
  ]
---

# Card

Core card representation and mana-cost expansion (including hybrid `{R/G}` and `{1}{U/B}`). Land kinds cover Fast/Slow/Battle/Turn/Surveil/Bounce/Triome/Cycling/Pain/Fetch/Canopy/Pathway cycles. `basicLandTypes` / `checkTypes` bitmasks support board-aware auto-tap.

## See also

- [Src](src.md)
- [Collection](collection.md)
