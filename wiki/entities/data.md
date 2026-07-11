---
type: entity
title: Data
last_updated: 2026-07-11T00:35:02Z
tags: [data, src]
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
