---
type: entity
title: Deck
last_updated: 2026-07-11T19:11:50Z
tags: [deck, src]
related:
  [entities/collection.md, entities/run.md, concepts/land-mana.md, concepts/landlord-ts-api.md]
status: active
summary: Arena/Moxfield decklist parser with sideboard strip, About skip, X=/T=/M=, DFC land-face detection, and DeckcodeError.
code_refs: [src/deck.ts]
---

# Deck

Parses Arena-style and Moxfield-style lists. Pass the full export string — the parser:

- Looks up cards by **name only** (Arena `(SET) collector` codes are captured but not used for lookup)
- Skips `About` / `Commander` / `Companion` sections until a `Deck` line
- Stops at `Sideboard` / `Maybeboard` (and at the first blank line), so sideboard cards are never included

Modifiers: `X=` (X-cost), `T=` (turn delay), `M=` / `M=auto` (force land mana / other face).

Without an explicit `M=`, spell//land DFCs automatically use the land face (same as `M=auto`) when a sibling land face exists.

`M={W}` / `M={C}` / etc. is the workaround when default land mana is wrong (e.g. under-modeled chooser lands) — see [Land mana](../concepts/land-mana.md).

Parse failures throw **`DeckcodeError`** (exported). The [run](run.md) façade wraps those as `RunValidationError` with `cause` set to the `DeckcodeError` — see [landlord-ts API](../concepts/landlord-ts-api.md).

## See also

- [Collection](collection.md)
- [Run](run.md)
- [Land mana](../concepts/land-mana.md)
- [landlord-ts API](../concepts/landlord-ts-api.md)
