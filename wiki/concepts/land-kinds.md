---
type: concept
title: Land kinds
last_updated: 2026-07-11T00:12:37Z
tags: [simulation, mana, lands]
related:
  [
    concepts/auto-tap.md,
    concepts/land-mana.md,
    concepts/mana-source-roadmap.md,
    entities/card.md,
    entities/scryfall.md,
    entities/hand.md,
    sources/magic-comprehensive-rules-20260619.md,
  ]
sources: [sources/magic-comprehensive-rules-20260619.md]
status: active
summary: CardKind land taxonomy — ETB-gated kinds vs nickname/stats kinds, classification order, bitmasks.
code_refs: [src/card/types.ts, src/card/land-types.ts, src/scryfall.ts, src/hand.ts]
---

# Land kinds

Every land in the card DB has a `CardKind`. Classification runs in `landKindFromOracleText` (order matters). Auto-tap then treats kinds as either **always available** (Karsten “sources in hand”) or **conditional ETB** (gated on play turn / board).

Mana **colors** (colorless, any-color, `SPECIAL_LANDS`) and **quantity** (`manaPerTap`) are separate from kind — see [Land mana](land-mana.md). `manaPerTap` does not change ETB classification.

Official definitions for basic land types, Basic vs nonbasic, and playing lands: [Magic Comprehensive Rules (2026-06-19)](../sources/magic-comprehensive-rules-20260619.md) (CR 305, 205.3i / 205.4c).

## Taxonomy

### Conditional ETB (board / turn gates)

These can enter tapped; `availableTurnForLand` may delay mana until `playTurn + 1`.

| Kind          | Untapped when                                               | Typical examples                  |
| ------------- | ----------------------------------------------------------- | --------------------------------- |
| `TapLand`     | never on play turn                                          | Guildgates, many utility taps     |
| `SurveilLand` | never on play turn (same as Tap)                            | Surveil duals                     |
| `BounceLand`  | never on play turn                                          | Karoo / bounce duals              |
| `TriomeLand`  | never on play turn                                          | Triomes (3+ basic types + tapped) |
| `CyclingLand` | never on play turn                                          | Cycling tapped lands              |
| `CheckLand`   | board already has a required basic land type (`checkTypes`) | Glacial Fortress                  |
| `FastLand`    | `otherLands <= 2`                                           | Botanical Sanctum                 |
| `SlowLand`    | `otherLands >= 2` (any lands)                               | Deserted Beach                    |
| `BattleLand`  | `basicsOnBoard >= 2` (Basic-supertype only)                 | Prairie Stream                    |
| `TurnLand`    | `playTurn <= 3`                                             | Starting Town                     |

Nickname kinds Surveil / Bounce / Triome / Cycling share TapLand ETB timing; they exist so deck stats and outputs can break out those cycles.

### Always available (no ETB delay in sim)

Counted as mana sources as soon as they are in hand by the goal turn (play schedule still assigns a calendar play turn for board state).

| Kind          | Notes                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `BasicLand`   | Also increments `basicsOnBoard` for BattleLand                                   |
| `ShockLand`   | Model always pays 2 life → always untapped                                       |
| `PainLand`    | Untapped pain duals                                                              |
| `FetchLand`   | Fetching not simulated; treated as an untapped source                            |
| `CanopyLand`  | Canopy / draw-sac lands                                                          |
| `PathwayLand` | Name contains “Pathway”; colors from `SPECIAL_LANDS` ([Land mana](land-mana.md)) |
| `OtherLand`   | Untapped utility / catch-all (includes under-modeled chooser lands)              |
| `ForcedLand`  | Deck-forced land face / overrides                                                |

## Classification order

First match wins in `landKindFromOracleText`:

Shock → Check → Fast → Slow → Battle → Turn → Bounce → Surveil → Triome → Cycling → Tap → Fetch → Canopy → Pain → Pathway → Basic → Other.

`npm run mine-etb` clusters unique “enters tapped” oracle clauses for classifier maintenance.

## Bitmasks

- `basicLandTypes` — Plains/Island/Swamp/Mountain/Forest subtypes from `type_line` (unlocks Checks; duals with basic types count).
- `checkTypes` — types named after “unless you control” on Check lands only.
- BattleLand uses **Basic-supertype** count on the board, not duals that merely list basic types.

## Play strategy (auto-tap)

See [Auto-tap](auto-tap.md) for the full schedule + matching rules. Short version:

1. Assign earliest play turns (opening lands `1..n` in hand order; drawn lands by calendar draw turn).
2. Compress to one land per turn: `playTurn = max(earliest, lastPlay + 1)`.
3. Walk that FIFO board; apply ETB gates; bipartite-match lands to the goal spell’s pips.

## See also

- [Auto-tap](auto-tap.md)
- [Land mana](land-mana.md)
- [Mana source roadmap](mana-source-roadmap.md)
- [Card](../entities/card.md)
- [Scryfall](../entities/scryfall.md)
- [Hand](../entities/hand.md)
- [Magic Comprehensive Rules (2026-06-19)](../sources/magic-comprehensive-rules-20260619.md)
