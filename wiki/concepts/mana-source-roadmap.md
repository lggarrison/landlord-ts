---
type: concept
title: Mana source roadmap
last_updated: 2026-07-11T00:12:37Z
aliases: [mana rocks, Gaea's Cradle, Nykthos, future mana sources]
tags: [simulation, mana, roadmap]
related: [concepts/land-mana.md, concepts/auto-tap.md, concepts/land-kinds.md, entities/hand.md]
status: wip
summary: Future work — board-state-dependent lands (Cradle, Nykthos) and non-land mana sources (mana rocks, dorks) are not modeled yet.
code_refs: [src/hand.ts, src/scryfall.ts, src/card/types.ts]
---

# Mana source roadmap

Documented gaps that need more than the current land color flags + `manaPerTap` multiplier. Nothing here is implemented yet (`status: wip`).

## Dynamic board-state-dependent lands

Examples: **Gaea’s Cradle**, **Itlimoc, Cradle of the Sun** (`{T}: Add {G}` for each creature you control), **Nykthos, Shrine to Nyx** (mana of any color equal to your devotion to that color).

Why `manaPerTap` is not enough: quantity (and sometimes color) depends on live board state — creature count, devotion — which the sim does not track. Auto-tap only schedules **lands** and never counts nonland permanents cast earlier in the game.

A real fix would need roughly:

1. Track creatures / colored permanents as they become available by the goal turn (or a simpler heuristic, e.g. “assume N creatures”).
2. Resolve dynamic lands’ mana amount from that board snapshot when building bipartite columns.
3. Decide how optimistic/pessimistic the creature/devotion estimate should be for Karsten-style on-curve questions.

Until then these lands keep their current single-unit-of-CI-color modeling (Cradle ≈ one green source).

## Mana rocks / non-land mana sources

Examples: **Sol Ring**, **Mind Stone**, **Arcane Signet**, the Signet cycle, mana-dork creatures like **Birds of Paradise**.

Architectural gap today:

- `isLandKind`, `scheduleLandPlays`, and `autoTapWithScratch` only ever look at land `CardKind`s.
- The bipartite match only draws columns from `scratch.lands`.

Supporting rocks/dorks would need:

1. **Classification** — which nonlands are mana sources, and what colors / quantities they produce.
2. **Casting sequence** — when the rock is cast relative to draws and the goal spell (a curve/sequencing problem, not a data tweak). Rocks cost mana to cast before they produce mana.
3. **Column pool** — feed those sources into the same bipartite matching as lands (possibly with their own `manaPerTap`).

That is a materially larger feature than land `manaPerTap` and is out of scope until the land model is solid.

## See also

- [Land mana](land-mana.md) — current color / `manaPerTap` model
- [Auto-tap](auto-tap.md) — land-only payment matching
- [Land kinds](land-kinds.md)
- [Hand](../entities/hand.md)
