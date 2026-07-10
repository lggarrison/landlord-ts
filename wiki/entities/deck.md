---
type: entity
title: Deck
last_updated: 2026-07-10T19:45:00Z
tags: [src, deck]
related: [entities/collection.md, entities/run.md]
status: active
summary: Arena decklist parser with X=, T=, M=, M=auto, and automatic DFC land-face detection.
code_refs: [src/deck.ts]
---

# Deck

Parses Arena-style lists; stops at Sideboard/Maybeboard/empty line. Modifiers: `X=` (X-cost), `T=` (turn delay), `M=` / `M=auto` (force land mana / other face).

Without an explicit `M=`, spell//land DFCs automatically use the land face (same as `M=auto`) when a sibling land face exists.

## See also

- [Collection](collection.md)
- [Run](run.md)
