---
type: entity
title: Scryfall
last_updated: 2026-10-14T20:25:00Z
tags: [scryfall, src]
related:
  [concepts/card-pipeline.md, concepts/land-kinds.md, concepts/land-mana.md, entities/data.md]
status: active
summary: Scryfall→Card conversion, nickname land cycles, SPECIAL_LANDS.
code_refs: [src/scryfall.ts, src/card/land-types.ts]
---

# Scryfall

Converts Scryfall oracle cards to landlord `Card`s. Classification order and kind meanings: [Land kinds](../concepts/land-kinds.md). Stores `basicLandTypes` / `checkTypes` bitmasks from `type_line` and oracle. Applies `SPECIAL_LANDS` color overrides — how those vectors are built (including colorless / any-color / chooser gaps): [Land mana](../concepts/land-mana.md).

Bulk fetch scripts resolve `jsonl_download_uri` from `/bulk-data` (see [Card pipeline](../concepts/card-pipeline.md)). `npm run mine-etb` clusters unique “enters tapped” clauses from that oracle bulk for classifier maintenance.

## See also

- [Card pipeline](../concepts/card-pipeline.md)
- [Land kinds](../concepts/land-kinds.md)
- [Land mana](../concepts/land-mana.md)
- [Data](data.md)
