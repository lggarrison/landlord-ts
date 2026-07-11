---
type: overview
title: Src
last_updated: 2026-07-11T03:54:00Z
tags: [src]
related:
  [
    concepts/landlord-ts-api.md,
    concepts/streaming-progress.md,
    concepts/auto-tap.md,
    concepts/land-kinds.md,
    concepts/card-pipeline.md,
    concepts/london-mulligan.md,
    concepts/monte-carlo-simulation.md,
    concepts/github-repo-hygiene.md,
    entities/run.md,
    entities/card.md,
    entities/deck.md,
  ]
sources: [sources/ts-port-feasibility.md]
status: active
summary: Package overview for `@lggarrison/landlord-ts` — Monte Carlo on-curve simulator under `src/`.
code_refs: [src/index.ts, src/run.ts]
---

# Src (`src/`)

TypeScript port of the Rust landlord engine. Primary entry: [`run()`](run.md) / [`runAsync()`](run.md) via the [landlord-ts API](../concepts/landlord-ts-api.md). Streaming hosts: [Streaming progress](../concepts/streaming-progress.md).

Board-aware land ETB (Check/Fast/Slow/Battle/Turn + nickname cycles), auto DFC face-detect, worker parallelization, and adaptive trial counts are implemented in this package. See [Land kinds](../concepts/land-kinds.md).

## Layout

| Module                        | Role                                       |
| ----------------------------- | ------------------------------------------ |
| [`card/`](card.md)            | ManaCost, Card, CardKind, land type bits   |
| [`collection`](collection.md) | Sorted card library + DFC faces            |
| [`deck`](deck.md)             | Arena decklist parse + modifiers           |
| [`bipartite`](bipartite.md)   | Mana payment matching                      |
| [`hand`](hand.md)             | Board-aware auto-tap                       |
| [`mulligan`](mulligan.md)     | London + Never                             |
| [`simulation`](simulation.md) | Monte Carlo loop (+ parallel / early-stop) |
| [`run`](run.md)               | Public façade                              |
| [`data`](data.md)             | Load `all_cards.json.gz`                   |
| [`scryfall`](scryfall.md)     | Land classifier + SPECIAL_LANDS            |

## See also

- [TS port feasibility plan](../sources/ts-port-feasibility.md)
- [landlord-ts API](../concepts/landlord-ts-api.md)
- [Streaming progress](../concepts/streaming-progress.md)
- [Auto-tap](../concepts/auto-tap.md)
- [Land kinds](../concepts/land-kinds.md)
- [Card pipeline](../concepts/card-pipeline.md)
- [London mulligan](../concepts/london-mulligan.md)
- [Monte Carlo simulation](../concepts/monte-carlo-simulation.md)
- [GitHub repo hygiene](../concepts/github-repo-hygiene.md)
- [Run](run.md)
- [Card](card.md)
- [Deck](deck.md)
