---
type: entity
title: Scryfall
last_updated: 2026-07-10T18:30:00Z
tags: [src, scryfall]
related: [concepts/card-pipeline.md, entities/data.md]
status: active
summary: Scryfall→Card conversion, land classification, SPECIAL_LANDS.
code_refs: [src/scryfall.ts]
---

# Scryfall

Converts Scryfall oracle cards to landlord `Card`s; classifies Tap/Check/Shock/Basic lands from modernized oracle text; applies `SPECIAL_LANDS` color overrides.

## See also

- [Card pipeline](../concepts/card-pipeline.md)
- [Data](data.md)
