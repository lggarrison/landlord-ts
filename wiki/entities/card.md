---
type: entity
title: Card
last_updated: 2026-07-10T22:55:00Z
tags: [src, card]
related:
  [
    entities/src.md,
    entities/collection.md,
    concepts/land-kinds.md,
    sources/magic-comprehensive-rules-20260619.md,
  ]
sources: [sources/magic-comprehensive-rules-20260619.md]
status: active
summary: Card, CardKind land taxonomy, ManaCost, and land-type bitmasks.
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

Core card representation and mana-cost expansion (including hybrid `{R/G}` and `{1}{U/B}`). Land `CardKind` values and `basicLandTypes` / `checkTypes` bitmasks are documented under [Land kinds](../concepts/land-kinds.md).

## See also

- [Src](src.md)
- [Collection](collection.md)
- [Land kinds](../concepts/land-kinds.md)
- [Magic Comprehensive Rules (2026-06-19)](../sources/magic-comprehensive-rules-20260619.md)
