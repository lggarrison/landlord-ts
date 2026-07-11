---
type: concept
title: mtgoncurve API
last_updated: 2026-07-11T02:40:13Z
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
summary: Snake_case run() / runAsync() Input, flattened RunOutput, RunValidationError, and SSE event types.
code_refs: [src/run.ts, src/index.ts, src/observations-report.ts, src/deck.ts]
---

# mtgoncurve API

Public façade for `@lggarrison/landlord-ts`. `RunInput` field names are snake_case (mtgoncurve-inspired). `RunOutput` is a single flattened on-curve report — not a dual raw-counter + report layout.

## `run(input)`

Synchronous Monte Carlo simulation. Returns a full `RunOutput` when finished.

```ts
import { run } from '@lggarrison/landlord-ts';

const output = run({
  code,
  runs,
  on_the_play,
  mulligan_down_to,
  mulligan_on_lands,
  acceptable_hand_list,
  // Optional:
  // seed,
  // starting_hand_size,
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
  // batch_size: 500, // ignored when epsilon is set
  // signal, // AbortSignal — stops between batches
  on_progress: ({ completed, total, phase }) => {
    /* e.g. write an SSE event */
  },
});
```

- `on_progress` — optional; called after each hand batch with `phase: 'simulating'`, then once with `phase: 'scoring'` before report build. Errors thrown here abort the run.
- `batch_size` — trials per tick when `epsilon` is unset (default `500`). When `epsilon` is set, batches match sync adaptive (1000) so seeded results match `run()`.
- `signal` — optional `AbortSignal`; aborted between batches (and after the scoring tick yield) with `AbortError`.
- With `epsilon`, `total` is the max (`runs`); early-stop may finish with `completed < total`.
- Seeded runs match seeded `run({ ..., parallel: false })` (including `epsilon` early-stop).
- Lower-level `simulationFromConfigAsync` requires `options.cards` when `epsilon` is set (throws otherwise). `runAsync` always supplies non-land cards.

For Next.js SSE wiring, see [Streaming progress](streaming-progress.md).

## Validation errors

Invalid decklists / empty decks / unknown `acceptable_hand_list` names throw **`RunValidationError`** (exported). Bad deckcode wraps the underlying **`DeckcodeError`** (also exported) as `error.cause`. Hosts can map `instanceof RunValidationError` to HTTP 400.

## `RunInput`

| Field                  | Type         | Notes                                   |
| ---------------------- | ------------ | --------------------------------------- |
| `code`                 | `string`     | Arena decklist                          |
| `runs`                 | `number`     | Trial count (max when `epsilon` is set) |
| `on_the_play`          | `boolean`    |                                         |
| `mulligan_down_to`     | `number`     | London floor                            |
| `mulligan_on_lands`    | `number[]`   | Land counts that trigger a mulligan     |
| `acceptable_hand_list` | `string[][]` | Keep hands by card name                 |
| `seed?`                | `number`     | Reproducible RNG                        |
| `starting_hand_size?`  | `number`     | Default 7                               |
| `epsilon?`             | `number`     | Wilson early-stop half-width            |
| `parallel?`            | `boolean`    | Worker sharding for sync `run` only     |

## `RunAsyncInput`

`RunInput` plus:

| Field          | Type                       | Notes                                      |
| -------------- | -------------------------- | ------------------------------------------ |
| `on_progress?` | `(p: RunProgress) => void` | Progress callback                          |
| `batch_size?`  | `number`                   | Default 500; ignored when `epsilon` is set |
| `signal?`      | `AbortSignal`              | Cancel between batches                     |

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

| Field                                              | Notes                                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `total_simulations`                                | Trial count (may be below `runs` when `epsilon` early-stops)                                                                                                      |
| `avg_opening_hand_size` / `avg_opening_land_count` | After mulligans                                                                                                                                                   |
| `deck_size` / `deck_average_cmc`                   | Deck summary                                                                                                                                                      |
| `cards[]`                                          | Per non-land: `played_on_curve`, `not_played_on_curve`, `total_simulations`, rates, failure modes (`not_enough_lands`, `color_or_timing_fail`, `mana_ok_undrawn`) |
| `weakest_on_curve`                                 | All non-lands sorted ascending by `p_cast_on_curve`                                                                                                               |
| `color_constrained`                                | Cards with `(cmc - mana) / cmc >= COLOR_CONSTRAINED_THRESHOLD` (exported; default `0.15`)                                                                         |
| `draw_dependent`                                   | Cards with `(mana - play) / mana >= DRAW_DEPENDENT_THRESHOLD` (exported; default `0.15`)                                                                          |
| `land_counts`                                      | `LandCount` rows (`name`, `kind`, `copies`, `image_uri`, `mana_cost`, `hash`)                                                                                     |
| `total_land_counts`                                | `ManaColorCount`                                                                                                                                                  |
| `basic_land_counts` … `pathway_land_counts`        | Per land-kind mana counts                                                                                                                                         |
| `other_land_counts`                                | Other / forced lands                                                                                                                                              |
| `non_land_counts`                                  | Non-land mana-cost tallies                                                                                                                                        |

Land-kind count fields: `basic_`, `tap_`, `check_`, `shock_`, `fast_`, `slow_`, `battle_`, `turn_`, `surveil_`, `bounce_`, `triome_`, `cycling_`, `pain_`, `fetch_`, `canopy_`, `pathway_`, `other_`, `non_land_` (each a `ManaColorCount`).

Failure-mode identity per card: `not_enough_lands + color_or_timing_fail + mana_ok_undrawn + played_on_curve === total_simulations`.

Insight thresholds are exported as `COLOR_CONSTRAINED_THRESHOLD` and `DRAW_DEPENDENT_THRESHOLD` so hosts can document or mirror the cutoffs. The builder that applies them is package-internal; only the flattened `RunOutput` fields are public.

Internal Monte Carlo aggregation still uses `Observations` (`mana` / `cmc` / `play` / …) in `simulation.ts`; those counters are not exposed on `RunOutput`.

## See also

- [Run](../entities/run.md)
- [Src](../entities/src.md)
- [Streaming progress](streaming-progress.md)
- [Monte Carlo simulation](monte-carlo-simulation.md)
