---
type: entity
title: Collection
last_updated: 2026-07-11T19:11:50Z
tags: [collection, src]
related: [entities/card.md, entities/deck.md]
status: active
summary: Sorted card library with name lookup and otherFacesByName for DFCs.
code_refs: [src/collection.ts]
---

# Collection

Cards are sorted by lowercased name with `localeCompare`. `cardFromName` binary-searches with the same `localeCompare` order (not raw code-unit `<`), so names with commas/apostrophes resolve correctly. `otherFacesByName` resolves sibling DFC faces sharing an `oracleId` (used by `M=auto`).

## See also

- [Card](card.md)
- [Deck](deck.md)
