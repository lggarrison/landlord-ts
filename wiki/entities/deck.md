---
type: entity
title: Deck
last_updated: 2026-07-10T18:30:00Z
tags: [src, deck]
related: [entities/collection.md, entities/run.md]
status: active
summary: Arena decklist parser with X=, T=, M=, and M=auto modifiers.
code_refs: [src/deck.ts]
---

# Deck

Parses Arena-style lists; stops at Sideboard/Maybeboard/empty line. Modifiers: `X=` (X-cost), `T=` (turn delay), `M=` / `M=auto` (force land mana / other face).

## See also

- [Collection](collection.md)
- [Run](run.md)
