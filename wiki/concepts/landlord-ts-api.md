---
type: concept
title: landlord-ts API
last_updated: 2026-07-11T19:29:00Z
aliases: [mtgoncurve API]
tags: [api]
related:
  [
    entities/run.md,
    entities/src.md,
    concepts/streaming-progress.md,
    concepts/monte-carlo-simulation.md,
  ]
sources: [sources/ts-port-feasibility.md]
status: active
summary: CamelCase run()/runAsync(), parseDecklist Result for UI validation, RunValidationError, and SSE event types.
code_refs: [src/run.ts, src/index.ts, src/observations-report.ts, src/deck.ts]
---

# landlord-ts API

Public façade for `@lggarrison/landlord-ts`. `RunInput` / `RunOutput` field names are camelCase. `RunOutput` is a single flattened on-curve report — not a dual raw-counter + report layout.

## `run(input)`

Synchronous Monte Carlo simulation. Returns a full `RunOutput` when finished.

```ts
import { run } from '@lggarrison/landlord-ts';

const output = run({
  code,
  runs,
  onThePlay,
  mulliganDownTo,
  mulliganOnLands,
  acceptableHandList,
  // Optional:
  // seed,
  // startingHandSize,
  // epsilon,
  // parallel,
});
```

## `runAsync(input)`

Async variant for streaming hosts. Same deck/mulligan/`RunOutput` shaping as `run()`, but hand generation is always **sequential batches** (`parallel` is ignored) so the event loop can flush between ticks.

```ts
import { runAsync } from '@lggarrison/landlord-ts';

const output = await runAsync({
  ...runInput,
  // Optional:
  // batchSize: 500, // ignored when epsilon is set
  // signal, // AbortSignal — stops between batches
  onProgress: ({ completed, total, phase }) => {
    /* e.g. write an SSE event */
  },
});
```

- `onProgress` — optional; called after each hand batch with `phase: 'simulating'`, then once with `phase: 'scoring'` before report build. Errors thrown here abort the run.
- `batchSize` — trials per tick when `epsilon` is unset (default `500`). When `epsilon` is set, batches match sync adaptive (1000) so seeded results match `run()`.
- `signal` — optional `AbortSignal`; aborted between batches and before report build (even without `onProgress`) with `AbortError`.
- With `epsilon`, `total` is the max (`runs`); early-stop may finish with `completed < total`.
- Seeded runs match seeded `run({ ..., parallel: false })` (including `epsilon` early-stop).
- Lower-level `simulationFromConfigAsync` requires `options.cards` when `epsilon` is set (throws otherwise). `runAsync` always supplies non-land cards.

For Next.js SSE wiring, see [Streaming progress](streaming-progress.md).

## Validation errors

Invalid decklists / empty decks / unknown `acceptableHandList` names throw **`RunValidationError`** (exported). Bad deckcode wraps the underlying **`DeckcodeError`** (also exported) as `error.cause`. Hosts can map `instanceof RunValidationError` to HTTP 400.

For textarea validation **before** simulating, use **`parseDecklist(code)`** (non-throwing):

```ts
import { parseDecklist } from '@lggarrison/landlord-ts';

const parsed = parseDecklist(code);
if (!parsed.ok) {
  // parsed.error.message — e.g. Cannot find card named "…" / Cannot find cards in collection: …
  // parsed.error.unknownCardNames — all unresolved names (set/collector stripped)
  // parsed.error.unknownCardName — first unknown (convenience)
  return;
}
// parsed.deck is ready; then call run({ code, … })
```

## `RunInput`

| Field                | Type         | Notes                                   |
| -------------------- | ------------ | --------------------------------------- |
| `code`               | `string`     | Arena decklist                          |
| `runs`               | `number`     | Trial count (max when `epsilon` is set) |
| `onThePlay`          | `boolean`    |                                         |
| `mulliganDownTo`     | `number`     | London floor                            |
| `mulliganOnLands`    | `number[]`   | Land counts that trigger a mulligan     |
| `acceptableHandList` | `string[][]` | Keep hands by card name                 |
| `seed?`              | `number`     | Reproducible RNG                        |
| `startingHandSize?`  | `number`     | Default 7                               |
| `epsilon?`           | `number`     | Wilson early-stop half-width            |
| `parallel?`          | `boolean`    | Worker sharding for sync `run` only     |

## `RunAsyncInput`

`RunInput` plus:

| Field         | Type                       | Notes                                      |
| ------------- | -------------------------- | ------------------------------------------ |
| `onProgress?` | `(p: RunProgress) => void` | Progress callback                          |
| `batchSize?`  | `number`                   | Default 500; ignored when `epsilon` is set |
| `signal?`     | `AbortSignal`              | Cancel between batches                     |

`RunProgress` is `{ completed: number; total: number; phase: 'simulating' | 'scoring' }` (**breaking** vs earlier `{ completed, total }` — update host typings).

## `SimulateStreamEvent`

Types-only SSE contract for Pattern A hosts (no Next.js dependency):

| Variant                 | Shape                                 |
| ----------------------- | ------------------------------------- |
| `SimulateProgressEvent` | `{ type: 'progress' } & RunProgress`  |
| `SimulateDoneEvent`     | `{ type: 'done'; result: RunOutput }` |
| `SimulateErrorEvent`    | `{ type: 'error'; message: string }`  |
| `SimulateStreamEvent`   | Union of the three                    |

## `RunOutput`

| Field                                        | Notes                                                                                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalSimulations`                           | Trial count (may be below `runs` when `epsilon` early-stops)                                                                                         |
| `avgOpeningHandSize` / `avgOpeningLandCount` | After mulligans                                                                                                                                      |
| `deckSize` / `deckAverageCmc`                | Deck summary                                                                                                                                         |
| `cards[]`                                    | Per non-land: `playedOnCurve`, `notPlayedOnCurve`, `totalSimulations`, rates, failure modes (`notEnoughLands`, `colorOrTimingFail`, `manaOkUndrawn`) |
| `weakestOnCurve`                             | All non-lands sorted ascending by `pCastOnCurve`                                                                                                     |
| `colorConstrained`                           | Cards with `(cmc - mana) / cmc >= COLOR_CONSTRAINED_THRESHOLD` (exported; default `0.15`)                                                            |
| `drawDependent`                              | Cards with `(mana - play) / mana >= DRAW_DEPENDENT_THRESHOLD` (exported; default `0.15`)                                                             |
| `landCounts`                                 | `LandCount` rows (`name`, `kind`, `copies`, `imageUri`, `manaCost`, `hash`)                                                                          |
| `totalLandCounts`                            | `ManaColorCount`                                                                                                                                     |
| `basicLandCounts` … `pathwayLandCounts`      | Per land-kind mana counts                                                                                                                            |
| `otherLandCounts`                            | Other / forced lands                                                                                                                                 |
| `nonLandCounts`                              | Non-land mana-cost tallies                                                                                                                           |

Land-kind count fields: `basicLandCounts`, `tapLandCounts`, `checkLandCounts`, `shockLandCounts`, `fastLandCounts`, `slowLandCounts`, `battleLandCounts`, `turnLandCounts`, `surveilLandCounts`, `bounceLandCounts`, `triomeLandCounts`, `cyclingLandCounts`, `painLandCounts`, `fetchLandCounts`, `canopyLandCounts`, `pathwayLandCounts`, `otherLandCounts`, `nonLandCounts` (each a `ManaColorCount`).

Failure-mode identity per card: `notEnoughLands + colorOrTimingFail + manaOkUndrawn + playedOnCurve === totalSimulations`.

Insight thresholds are exported as `COLOR_CONSTRAINED_THRESHOLD` and `DRAW_DEPENDENT_THRESHOLD` so hosts can document or mirror the cutoffs. The builder that applies them is package-internal; only the flattened `RunOutput` fields are public.

Internal Monte Carlo aggregation still uses `Observations` (`mana` / `cmc` / `play` / …) in `simulation.ts`; those counters are not exposed on `RunOutput`.

## See also

- [Run](../entities/run.md)
- [Src](../entities/src.md)
- [Streaming progress](streaming-progress.md)
- [Monte Carlo simulation](monte-carlo-simulation.md)
