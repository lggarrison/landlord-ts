---
type: entity
title: Collection
last_updated: 2026-07-11T00:35:02Z
tags: [collection, src]
related: [entities/card.md, entities/deck.md]
status: active
summary: Sorted card library with name lookup and otherFacesByName for DFCs.
code_refs: [src/collection.ts]
---

# Collection

Binary-search by name; `otherFacesByName` resolves sibling DFC faces sharing an `oracleId` (used by `M=auto`).

## See also

- [Card](card.md)
- [Deck](deck.md)
