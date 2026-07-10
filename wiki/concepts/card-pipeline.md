---
type: concept
title: Card pipeline
last_updated: 2026-07-10T19:45:00Z
tags: [data, scryfall]
related: [entities/scryfall.md, entities/data.md]
status: active
summary: Scryfall bulk oracle cards → landlord Card JSON.gz via scripts/card-update.ts; weekly GH Actions cron.
code_refs: [src/scryfall.ts, src/data.ts, scripts/card-update.ts, scripts/mine-etb.ts]
---

# Card pipeline

`npm run card-update` downloads Scryfall oracle bulk data (JSON or gzipped JSONL), filters non-legal tokens, flattens DFC faces, classifies lands (including Fast/Slow/Turn), and writes `data/all_cards.json.gz`.

`npm run mine-etb` prints unique ETB clause clusters for classifier review.

Weekly GitHub Action (`.github/workflows/card-update.yml`) refreshes the gzip and opens a PR when data changes.

## See also

- [Scryfall](../entities/scryfall.md)
- [Data](../entities/data.md)
