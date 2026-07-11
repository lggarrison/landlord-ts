---
type: entity
title: Scryfall
last_updated: 2026-07-11T00:35:02Z
tags: [scryfall, src]
related:
  [concepts/card-pipeline.md, concepts/land-kinds.md, concepts/land-mana.md, entities/data.md]
status: active
summary: Scryfall→Card conversion, nickname land cycles, SPECIAL_LANDS.
code_refs: [src/scryfall.ts, src/card/land-types.ts]
---

# Scryfall

Converts Scryfall oracle cards to landlord `Card`s. Classification order and kind meanings: [Land kinds](../concepts/land-kinds.md). Stores `basicLandTypes` / `checkTypes` bitmasks from `type_line` and oracle. Applies `SPECIAL_LANDS` color overrides — how those vectors are built (including colorless / any-color / chooser gaps): [Land mana](../concepts/land-mana.md).

`npm run mine-etb` clusters unique “enters tapped” clauses from oracle bulk data for classifier maintenance.

## See also

- [Card pipeline](../concepts/card-pipeline.md)
- [Land kinds](../concepts/land-kinds.md)
- [Land mana](../concepts/land-mana.md)
- [Data](data.md)
