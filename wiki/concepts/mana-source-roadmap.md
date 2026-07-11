---
type: concept
title: Mana source roadmap
last_updated: 2026-07-11T00:39:08Z
aliases: [mana rocks, Gaea's Cradle, Nykthos, future mana sources, Lotus Field single color]
tags: [simulation, mana, roadmap]
related: [concepts/land-mana.md, concepts/auto-tap.md, concepts/land-kinds.md, entities/hand.md]
status: wip
summary: Future work — Cradle/Nykthos, mana rocks/dorks, and Lotus Field single-color-per-tap enforcement.
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

## Lotus Field — single color per tap

**Lotus Field** is already in `SPECIAL_LANDS` (rainbow) and `MULTI_MANA_LANDS` (`manaPerTap = 3`). Code comments on both entries call out the overestimate.

| Reality                                    | Current model                                       |
| ------------------------------------------ | --------------------------------------------------- |
| `{T}: Add three mana of any **one** color` | Three bipartite columns, each with full WUBRG flags |

That lets the matcher pay multicolor costs like `{R}{G}{U}` from one Lotus Field, which is illegal under the real rules.

**Feature improvement:** enforce a single chosen color across all columns produced by one tap — e.g. when expanding `manaPerTap`, either:

1. Try each monocolor expansion (all-R / all-G / …) the way hybrid costs already try expansions, or
2. Tag multi-mana columns as “linked same-color” and constrain the bipartite match so those columns share one color.

Until then the optimistic approximation stands (same family as Command Tower / chooser lands). Documented for maintainers in `src/scryfall.ts` next to the Lotus Field / `MULTI_MANA_LANDS` entries; behavior summary in [Land mana](land-mana.md).

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

- [Land mana](land-mana.md) — current color / `manaPerTap` model (including Lotus Field caveat)
- [Auto-tap](auto-tap.md) — land-only payment matching
- [Land kinds](land-kinds.md)
- [Hand](../entities/hand.md)
