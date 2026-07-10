---
type: source
title: Magic Comprehensive Rules (2026-06-19)
last_updated: 2026-07-10T23:20:00Z
tags: [mtg, rules, lands, mana]
related: [concepts/land-kinds.md, concepts/auto-tap.md, entities/card.md]
status: active
summary: Provenance for MTG Comprehensive Rules (2026-06-19) — upstream URL only; landlord-relevant CR section map.
sources: [raw/articles/magic-comprehensive-rules-20260619.md]
---

# Magic Comprehensive Rules (2026-06-19)

Official competitive rules for Magic: The Gathering (Wizards of the Coast copyright).

- URL: https://media.wizards.com/2026/downloads/MagicCompRules%2020260619.txt
- Effective: June 19, 2026
- Raw artifact: `raw/articles/magic-comprehensive-rules-20260619.md` (provenance stub — **not** the full CR text)

This MIT-licensed repo does not redistribute the verbatim Comprehensive Rules. Fetch the official download when you need the full document. landlord does **not** implement a rules engine; it approximates mana availability for on-curve Monte Carlo. Use this source when classifying lands or debating whether a sim shortcut matches CR intent.

## Sections most relevant to landlord

| Topic                                                  | CR                  | Landlord use                                                            |
| ------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------- |
| Playing a land (one per turn, special action)          | 305.1–305.4         | `scheduleLandPlays` one-land-per-turn calendar                          |
| Basic land types (Plains/Island/Swamp/Mountain/Forest) | 305.6, 205.3i       | `basicLandTypes` bitmask; intrinsic mana abilities                      |
| Basic vs nonbasic (supertype)                          | 305.8, 205.4c       | BattleLand counts Basic-supertype only, not duals with basic types      |
| Land subtypes list                                     | 205.3i              | Type-line parsing; Town etc. are land types but not “basic land types”  |
| Mana / mana abilities                                  | 106, 605            | Auto-tap models tap-for-mana payment, not the full priority stack       |
| Costs / paying mana                                    | 118                 | Bipartite matching of pips to land columns                              |
| Enters-the-battlefield / replacement effects           | 614 (and card text) | Conditional ETB kinds mirror common land replacement text, not full 614 |

Card-specific ETB (“enters tapped unless…”, “two or fewer other lands”, etc.) lives on oracle text; the CR defines the framework those abilities use.

## Out of scope for the sim

Stack, priority, responses to lands (lands are not spells — 305.1), fetching resolution, life payment choices beyond Shock’s always-pay model, and chooser lands (e.g. Cavern of Souls) are not fully simulated.

## See also

- [Land kinds](../concepts/land-kinds.md)
- [Auto-tap](../concepts/auto-tap.md)
- [Card](../entities/card.md)
