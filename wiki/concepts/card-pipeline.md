---
type: concept
title: Card pipeline
last_updated: 2026-07-10T18:30:00Z
tags: [data, scryfall]
related: [entities/scryfall.md, entities/data.md]
status: active
summary: Scryfall bulk oracle cards → landlord Card JSON.gz via scripts/card-update.ts.
code_refs: [src/scryfall.ts, src/data.ts]
---

# Card pipeline

`npm run card-update` downloads Scryfall oracle bulk data (JSON or gzipped JSONL), filters non-legal tokens, flattens DFC faces, classifies lands, and writes `data/all_cards.json.gz`.

## See also

- [Scryfall](../entities/scryfall.md)
- [Data](../entities/data.md)
