---
type: entity
title: Data
last_updated: 2026-07-10T18:30:00Z
tags: [src, data]
related: [concepts/card-pipeline.md, entities/scryfall.md]
status: active
summary: Lazy load of gzipped all_cards.json.gz via fflate.
code_refs: [src/data.ts]
---

# Data

Gunzips `data/all_cards.json.gz` once and exposes `ALL_CARDS`.

## See also

- [Card pipeline](../concepts/card-pipeline.md)
- [Scryfall](scryfall.md)
