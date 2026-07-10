---
type: concept
title: Auto-tap
last_updated: 2026-07-10T18:30:00Z
tags: [simulation, mana]
related: [entities/hand.md, entities/bipartite.md]
status: active
summary: Paying spell costs with lands via bipartite matching; TapLand delay only.
code_refs: [src/hand.ts, src/bipartite.ts]
---

# Auto-tap

Lands drawn by the goal turn become columns; mana pips become rows. A spell is paid if matching size equals pip count. Hybrid costs try each expansion until one pays.

**TapLand delay:** usable on `playTurn + 1`. Check/Shock are immediate (board conditions not modeled).

## See also

- [Hand](../entities/hand.md)
- [Bipartite](../entities/bipartite.md)
