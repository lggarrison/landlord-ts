---
type: entity
title: Hand
last_updated: 2026-07-10T19:45:00Z
tags: [src, hand]
related: [concepts/auto-tap.md, entities/bipartite.md]
status: active
summary: Opening hand + draws; board-aware auto-tap for conditional ETB lands.
code_refs: [src/hand.ts]
---

# Hand

Auto-tap builds a bipartite graph of lands vs mana pips. FIFO play order drives Check/Fast/Slow/Turn board conditions; TapLand delays by one turn. Basics/Shock/Other/Forced remain immediately available when in hand.

`handFromOpeningAndDraws` accepts an optional `startingHandSize` (default 7).

## See also

- [Auto-tap](../concepts/auto-tap.md)
- [Bipartite](bipartite.md)
