---
type: concept
title: Auto-tap
last_updated: 2026-07-10T20:05:00Z
tags: [simulation, mana]
related: [entities/hand.md, entities/bipartite.md]
status: active
summary: Paying spell costs with lands via bipartite matching; board-aware ETB for Tap/Check/Fast/Slow/Battle/Turn.
code_refs: [src/hand.ts, src/bipartite.ts]
---

# Auto-tap

Lands drawn by the goal turn become columns; mana pips become rows. A spell is paid if matching size equals pip count. Hybrid costs try each expansion until one pays.

Lands in hand are ordered FIFO (opening, then draws) and assigned play turns `1..n` for board state. **Basics / Other / Forced / Shock / Pain / Fetch / Canopy / Pathway** stay available whenever drawn by the goal turn (Karsten “sources in hand”). Conditional lands gate on `availableTurn <= goalTurn`:

| Kind                                          | Untapped when                                |
| --------------------------------------------- | -------------------------------------------- |
| TapLand / Surveil / Bounce / Triome / Cycling | never on play turn (`playTurn + 1`)          |
| CheckLand                                     | board already has a required basic land type |
| FastLand                                      | `otherLands <= 2`                            |
| SlowLand                                      | `otherLands >= 2` (any lands)                |
| BattleLand                                    | `basicsOnBoard >= 2` (Basic-supertype only)  |
| TurnLand                                      | `playTurn <= 3` (e.g. Starting Town)         |

Shock lands always pay 2 life (always untapped). Basic land types on every land (from `type_line`) unlock Checks — including Shock duals. Battlelands require actual basics, not duals with basic types.

## See also

- [Hand](../entities/hand.md)
- [Bipartite](../entities/bipartite.md)
