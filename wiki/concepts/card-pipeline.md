---
type: concept
title: Card pipeline
last_updated: 2026-10-14T20:40:00Z
tags: [data, scryfall]
related:
  [entities/scryfall.md, entities/data.md, concepts/land-kinds.md, concepts/github-repo-hygiene.md]
status: active
summary: Scryfall bulk oracle cards → landlord Card JSON.gz via scripts/card-update.ts; weekly GH Actions cron.
code_refs:
  [
    src/scryfall.ts,
    src/data.ts,
    scripts/card-update.ts,
    scripts/mine-etb.ts,
    .github/workflows/card-update.yml,
    .github/workflows/prepare-release.yml,
  ]
---

# Card pipeline

`npm run card-update` fetches Scryfall `oracle_cards` bulk metadata and downloads via `jsonl_download_uri` (gzipped JSONL; `download_uri` was retired after 2026-07-20). It filters non-legal tokens, flattens DFC faces, classifies lands (see [Land kinds](land-kinds.md)), and writes `data/all_cards.json.gz`.

`npm run mine-etb` prints unique ETB clause clusters for classifier review (same bulk URI lookup).

Weekly GitHub Action (`.github/workflows/card-update.yml`) refreshes the gzip and opens a PR to `develop` when data changes. Publishing that file on npm is a separate release: Actions → **Prepare release** (see [GitHub repo hygiene](github-repo-hygiene.md) and `RELEASING.md`).

## See also

- [Scryfall](../entities/scryfall.md)
- [Data](../entities/data.md)
- [Land kinds](land-kinds.md)
- [GitHub repo hygiene](github-repo-hygiene.md)
