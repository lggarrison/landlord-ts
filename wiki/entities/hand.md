---
type: entity
title: Hand
last_updated: 2026-07-10T22:50:00Z
tags: [src, hand]
related: [concepts/auto-tap.md, concepts/land-kinds.md, entities/bipartite.md]
status: active
summary: Opening hand + draws; calendar land schedule and board-aware auto-tap.
code_refs: [src/hand.ts]
---

# Hand

`scheduleLandPlays` assigns calendar play turns (opening `1..n`, then draws; one land per turn). `autoTapWithScratch` walks that board and applies ETB gates from [Land kinds](../concepts/land-kinds.md) before bipartite-matching lands to the goal spell.

Always-available kinds (Basic / Shock / Pain / Fetch / Canopy / Pathway / Other / Forced) count as soon as they are in hand by the goal turn. Conditional kinds (Tap / Check / Fast / Slow / Battle / Turn and Tap-like nicknames) use `availableTurnForLand`.

`handFromOpeningAndDraws` accepts an optional `startingHandSize` (default 7).

## See also

- [Auto-tap](../concepts/auto-tap.md)
- [Land kinds](../concepts/land-kinds.md)
- [Bipartite](bipartite.md)
