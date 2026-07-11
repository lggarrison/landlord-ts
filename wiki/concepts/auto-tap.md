---
type: concept
title: Auto-tap
last_updated: 2026-07-11T00:32:26Z
tags: [simulation, mana]
related:
  [
    concepts/land-kinds.md,
    concepts/land-mana.md,
    concepts/mana-source-roadmap.md,
    entities/hand.md,
    entities/bipartite.md,
    sources/magic-comprehensive-rules-20260619.md,
  ]
sources: [sources/magic-comprehensive-rules-20260619.md]
status: active
summary: Paying spell costs with lands via bipartite matching; board-aware ETB for Tap/Check/Fast/Slow/Battle/Turn.
code_refs: [src/hand.ts, src/bipartite.ts]
---

# Auto-tap

Lands drawn by the goal turn become columns; mana pips become rows. A spell is paid if matching size equals pip count. Hybrid costs try each expansion until one pays. A land with `manaPerTap > 1` (e.g. Ancient Tomb, Lotus Field) occupies that many columns — see [Land mana](land-mana.md).

Land kind taxonomy (ETB vs always-available) lives in [Land kinds](land-kinds.md). How each land’s color capability flags are built (including colorless and chooser gaps): [Land mana](land-mana.md). Colored pips need a matching land flag; generic pips (spell `ManaCost.c`, from `{1}` / `{2}` / `{X}` — not true colorless-only `{C}`) accept any land. Non-land mana sources are not in this pool yet — [Mana source roadmap](mana-source-roadmap.md).

## Play schedule

1. **Earliest turn** — opening lands get `1..n` in hand order; drawn lands use the calendar draw turn (`drawIdx+2` on the play, `drawIdx+1` on the draw).
2. **One land per turn** — `playTurn = max(earliest, lastPlayTurn + 1)`.
3. **Board walk** — FIFO over that schedule; accumulate `basicLandTypes` and Basic-supertype count for Check / Battle gates.

## Availability

**`BasicLand` / `OtherLand` / `ForcedLand` / `ShockLand` / `PainLand` / `FetchLand` / `CanopyLand` / `PathwayLand`** stay available whenever drawn by the goal turn (Karsten “sources in hand”). Conditional lands gate on `availableTurn <= goalTurn`:

| Kind                                                                    | Untapped when                                |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| `TapLand` / `SurveilLand` / `BounceLand` / `TriomeLand` / `CyclingLand` | never on play turn (`playTurn + 1`)          |
| `CheckLand`                                                             | board already has a required basic land type |
| `FastLand`                                                              | `otherLands <= 2`                            |
| `SlowLand`                                                              | `otherLands >= 2` (any lands)                |
| `BattleLand`                                                            | `basicsOnBoard >= 2` (Basic-supertype only)  |
| `TurnLand`                                                              | `playTurn <= 3` (e.g. Starting Town)         |

Shock lands always pay 2 life (always untapped). Basic land types on every land (from `type_line`) unlock Checks — including Shock duals. Battlelands require actual basics, not duals with basic types.

## See also

- [Land kinds](land-kinds.md)
- [Land mana](land-mana.md)
- [Mana source roadmap](mana-source-roadmap.md)
- [Hand](../entities/hand.md)
- [Bipartite](../entities/bipartite.md)
- [Magic Comprehensive Rules (2026-06-19)](../sources/magic-comprehensive-rules-20260619.md)
