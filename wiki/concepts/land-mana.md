---
type: concept
title: Land mana
last_updated: 2026-07-11T00:32:26Z
aliases: [colorless lands, any-color mana, SPECIAL_LANDS, chooser lands, manaPerTap]
tags: [simulation, mana, lands]
related:
  [
    concepts/land-kinds.md,
    concepts/auto-tap.md,
    concepts/mana-source-roadmap.md,
    entities/scryfall.md,
    entities/deck.md,
    entities/hand.md,
    sources/magic-comprehensive-rules-20260619.md,
  ]
sources: [sources/magic-comprehensive-rules-20260619.md]
status: active
summary: How land ManaCost capability vectors and manaPerTap multipliers are built — color identity, SPECIAL_LANDS, chooser overrides, multi-mana lands.
code_refs: [src/scryfall.ts, src/card/mana-cost.ts, src/card/types.ts, src/hand.ts, src/deck.ts]
---

# Land mana

Land **kinds** ([Land kinds](land-kinds.md)) model ETB timing. Mana colors are a separate 0/1 capability vector on each land’s `ManaCost` (`r` / `g` / `b` / `u` / `w` / `c`), built when converting Scryfall cards. This is not a real MTG mana pool — each land is a column that can pay matching pips in [Auto-tap](auto-tap.md). A land with `manaPerTap > 1` occupies that many columns.

## Derivation order

In `scryfallCardToCard`, for lands:

1. If the card name is in `SPECIAL_LANDS`, use that fixed `ManaCost`.
2. Otherwise call `isColor01` once per color (and colorless) from Scryfall `color_identity` + oracle text.
3. Separately, `landKindFromOracleText` assigns the `CardKind` (ETB taxonomy).
4. `manaPerTap` comes from `MULTI_MANA_LANDS` (default `1`).

## `isColor01` rules

For each color letter W/U/B/R/G:

- Flag = 1 if that letter is in Scryfall `color_identity`.
- Also flag = 1 for **all five** colors when oracle contains `"Add one mana of any color."` **and** does **not** contain `"Add one mana of any color. Spend this mana only"`.

For colorless (`c`):

- Flag = 1 when `color_identity` is empty (e.g. Wastes, most colorless utility lands).

So:

| Pattern                                       | Resulting capabilities                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty CI, no any-color text                   | Colorless only (`c=1`)                                                                                                                                                 |
| CI has letters                                | Those colors = 1                                                                                                                                                       |
| Unrestricted “any color”                      | All five colors = 1 (plus `c` if CI empty)                                                                                                                             |
| Restricted “any color. Spend this mana only…” | Excluded from the `isColor01` any-color branch → colorless-only by default, **unless** the card name is one of the chooser lands overridden in `SPECIAL_LANDS` (below) |

## Payment semantics

In auto-tap bipartite matching:

- Colored spell pips require the matching land flag.
- **Generic** spell pips (the `c` field on a spell’s `ManaCost`, from symbols like `{1}` / `{2}` / `{X}`) accept **any** land column. The matcher hard-codes edges to `1` for those rows — it does **not** model true colorless-only `{C}` requirements separately from generic mana.
- A land’s own `c` flag does **not** unlock colored pips — it marks a colorless-only _source_ for stats and for lands with no WUBRG flags.
- A land with `manaPerTap = N` is pushed into the column pool `N` times (same color flags each time).

## Multi-mana lands (`manaPerTap`)

Some lands produce a **fixed** amount of mana greater than one per tap. Those are listed in `MULTI_MANA_LANDS` and expand into multiple bipartite columns:

| Card         | `manaPerTap` | Color vector                                         |
| ------------ | ------------ | ---------------------------------------------------- |
| Ancient Tomb | 2            | colorless (`c=1`)                                    |
| Lotus Field  | 3            | rainbow via `SPECIAL_LANDS` (no plain `{C}` ability) |

**Lotus Field caveat:** real oracle is “Add three mana of any **one** color.” The sim models it as WUBRG × 3 columns, so it can overestimate payability for multicolor costs (e.g. `{R}{G}{U}`). Same optimistic approximation family as Command Tower / chooser lands; enforcing a single chosen color per tap would need matcher changes beyond `manaPerTap`.

`manaPerTap` is orthogonal to `CardKind` — Lotus Field is still a `TapLand` for ETB; Ancient Tomb is `OtherLand`. Board bookkeeping (`otherLands`, `basicsOnBoard`) still counts each physical land once; only the mana-column pool is multiplied.

Board-state-dependent lands (Gaea’s Cradle, Nykthos, Itlimoc) and non-land mana sources (mana rocks) need more than a fixed multiplier — see [Mana source roadmap](mana-source-roadmap.md).

## Chooser / restricted any-color lands

Cards with oracle text `"Add one mana of any color. Spend this mana only to cast [a spell of a chosen/specific type]..."` — e.g. **Cavern of Souls**, **Secluded Courtyard**, **Unclaimed Territory**, **Ancient Ziggurat**, and 30+ similar tribal/typal lands (Ally Encampment, Sliver Hive, Voldaren Estate, Base Camp, …) — are individually overridden in `SPECIAL_LANDS` to **full rainbow** (all five colors = 1):

| Aspect        | Sim behavior                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kind          | Usually `OtherLand` or `TapLand` (unaffected by the mana override — ETB classification still comes from the card’s own “enters tapped” text)                                                                                          |
| Mana          | Rainbow (`r=g=b=u=w=1`); `c=1` too for the ones with an unconditional `{T}: Add {C}` ability (all except Ancient Ziggurat and Pillar of the Paruns)                                                                                   |
| Approximation | Assumes the player always chooses the creature type / spell type they actually need — same philosophy as the Command Tower / fetch-land overrides                                                                                     |
| Remaining gap | The `ManaCost` vector is static per land, not per goal spell, so this overestimates availability when the sim’s goal spell wouldn’t actually match the land’s restriction (e.g. a noncreature goal with a creature-type chooser land) |

Previously (before this override) these fell through to the default `isColor01` path and were colorless-only; that gap is called out as “not fully simulated” in [Magic Comprehensive Rules (2026-06-19)](../sources/magic-comprehensive-rules-20260619.md) — now mitigated by the rainbow override, with the goal-spell-mismatch caveat above still standing.

**Workaround for a mismatch:** decklist `M={W}` / `M={U}` / etc. forces a `ForcedLand` with explicit capabilities ([Deck](../entities/deck.md)).

## True colorless and Wastes

- **Wastes** — empty CI → `c=1`, kind `BasicLand`.
- **Colorless utility** forced in `SPECIAL_LANDS` to `(0,0,0,0,0,1)`: Kor Haven, Slayers' Stronghold, Alchemist's Refuge, Desolate Lighthouse.

## `SPECIAL_LANDS` groups

Name → fixed `ManaCost` overrides when Scryfall CI / oracle heuristics are wrong or incomplete. Groups in `src/scryfall.ts`:

| Group                      | Examples                                                                                                                     | Typical vector                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Colorless utility          | Kor Haven, Slayers' Stronghold, Alchemist's Refuge, Desolate Lighthouse                                                      | `c` only                                                                      |
| Rainbow / commander        | Command Tower, Path of Ancestry                                                                                              | all five colors                                                               |
| Rainbow + colorless        | Opal Palace                                                                                                                  | WUBRG + `c`                                                                   |
| Fetches / “fetch-likes”    | Onslaught/Zendikar fetches, Fabled Passage, Evolving Wilds, Terramorphic Expanse, Prismatic Vista                            | all five (fetching itself is not simulated — see [Land kinds](land-kinds.md)) |
| Kaldheim strongholds       | Axgard Armory, Bretagard Stronghold, …                                                                                       | single color                                                                  |
| Pathways                   | DFC combined names + each face                                                                                               | face colors; Searstep Pathway historically stores U instead of R              |
| Chooser / tribal (rainbow) | Cavern of Souls, Secluded Courtyard, Unclaimed Territory, Ancient Ziggurat, Pillar of the Paruns, and 30+ others (see above) | WUBRG (+ `c` for those with a plain `{T}: Add {C}` ability)                   |
| Multi-mana rainbow         | Lotus Field                                                                                                                  | WUBRG (`manaPerTap = 3`)                                                      |

Unrestricted any-color lands **not** in the map still get all five colors from the oracle branch of `isColor01`.

## Other under-modeled topics

- Chooser / tribal lands are modeled as rainbow (above), but that is still a per-land approximation, not per-goal-spell — see the “Remaining gap” row above.
- Snow mana / snow lands — not modeled as a distinct mana type.
- Dual-mode “add `{C}` or colored” beyond the `SPECIAL_LANDS` entries — only what CI / oracle / overrides produce.
- Fetch resolution and Shock life choice — documented on kinds / auto-tap, not as mana production.
- Dynamic lands and mana rocks — [Mana source roadmap](mana-source-roadmap.md).

## See also

- [Land kinds](land-kinds.md)
- [Auto-tap](auto-tap.md)
- [Mana source roadmap](mana-source-roadmap.md)
- [Scryfall](../entities/scryfall.md)
- [Deck](../entities/deck.md)
- [Hand](../entities/hand.md)
- [Magic Comprehensive Rules (2026-06-19)](../sources/magic-comprehensive-rules-20260619.md)
