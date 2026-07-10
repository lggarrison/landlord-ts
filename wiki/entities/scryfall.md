---
type: entity
title: Scryfall
last_updated: 2026-07-10T20:05:00Z
tags: [src, scryfall]
related: [concepts/card-pipeline.md, entities/data.md]
status: active
summary: Scryfall→Card conversion, nickname land cycles, SPECIAL_LANDS.
code_refs: [src/scryfall.ts, src/card/land-types.ts]
---

# Scryfall

Converts Scryfall oracle cards to landlord `Card`s. Land kinds (match order): Shock → Check → Fast → Slow → Battle → Turn → Bounce → Surveil → Triome → Cycling → Tap → Fetch → Canopy → Pain → Pathway → Basic → Other. Stores `basicLandTypes` / `checkTypes` bitmasks from `type_line` and oracle. Applies `SPECIAL_LANDS` color overrides.

`npm run mine-etb` clusters unique “enters tapped” clauses from oracle bulk data for classifier maintenance.

## See also

- [Card pipeline](../concepts/card-pipeline.md)
- [Data](data.md)
