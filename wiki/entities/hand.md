---
type: entity
title: Hand
last_updated: 2026-07-10T18:30:00Z
tags: [src, hand]
related: [concepts/auto-tap.md, entities/bipartite.md]
status: active
summary: Opening hand + draws; auto-tap with TapLand-only delay.
code_refs: [src/hand.ts]
---

# Hand

Auto-tap builds a bipartite graph of lands vs mana pips. Only `TapLand` is delayed (`playTurn + 1`); Check/Shock are immediately available.

## See also

- [Auto-tap](../concepts/auto-tap.md)
- [Bipartite](bipartite.md)
