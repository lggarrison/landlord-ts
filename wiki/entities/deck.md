---
type: entity
title: Deck
last_updated: 2026-07-11T19:29:00Z
tags: [deck, src]
related:
  [entities/collection.md, entities/run.md, concepts/land-mana.md, concepts/landlord-ts-api.md]
status: active
summary: Arena/Moxfield decklist parser with parseDecklist Result, sideboard strip, About skip, and DeckcodeError.
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

## APIs

- **`deckFromList` / `decklist`** — throwing parse; failures raise **`DeckcodeError`**.
- **`parseDecklist`** — non-throwing Result for UI validation before `run()`:
  - `{ ok: true, deck }` on success (rejects empty maindecks)
  - `{ ok: false, error }` on failure; `error.message` is human-readable
  - Unknown cards set **`error.unknownCardNames`** (all unresolved names, set/collector stripped) and **`error.unknownCardName`** (first) so hosts can list or highlight every bad card in one validate pass

The [run](run.md) façade wraps `DeckcodeError` as `RunValidationError` with `cause` set — see [landlord-ts API](../concepts/landlord-ts-api.md).

## See also

- [Collection](collection.md)
- [Run](run.md)
- [Land mana](../concepts/land-mana.md)
- [landlord-ts API](../concepts/landlord-ts-api.md)
