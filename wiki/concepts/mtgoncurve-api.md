---
type: concept
title: mtgoncurve API
last_updated: 2026-07-11T01:30:00Z
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
summary: Snake_case run() / runAsync() Input/Output contract compatible with mtgoncurve.com.
code_refs: [src/run.ts, src/index.ts]
---

# mtgoncurve API

Public façade for `@lggarrison/landlord-ts`. Field names match the mtgoncurve.com contract (`snake_case`).

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
  seed?,
  starting_hand_size?,
  epsilon?,
  parallel?,
});
```

## `runAsync(input)`

Async variant for streaming hosts. Same deck/mulligan/`RunOutput` shaping as `run()`, but hand generation is always **sequential batches** (`parallel` is ignored) so the event loop can flush between ticks.

```ts
import { runAsync } from '@lggarrison/landlord-ts';

const output = await runAsync({
  ...runInput,
  batch_size?, // default 500; ignored when epsilon is set
  signal?, // AbortSignal — stops between batches
  on_progress?: ({ completed, total }) => {
    /* e.g. write an SSE event */
  },
});
```

- `on_progress` — optional; called after each batch with `{ completed, total }`. Errors thrown here abort the run.
- `batch_size` — trials per tick when `epsilon` is unset (default `500`). When `epsilon` is set, batches match sync adaptive (1000) so seeded results match `run()`.
- `signal` — optional `AbortSignal`; aborted between batches with `AbortError`.
- With `epsilon`, `total` is the max (`runs`); early-stop may finish with `completed < total`.
- Seeded runs match seeded `run({ ..., parallel: false })` (including `epsilon` early-stop).

For Next.js SSE wiring, see [Streaming progress](streaming-progress.md).

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

`RunProgress` is `{ completed: number; total: number }`.

## `RunOutput`

| Field                                       | Notes                                       |
| ------------------------------------------- | ------------------------------------------- |
| `card_observations`                         | Non-land cards with per-card `Observations` |
| `land_counts`                               | Land rows (empty observations)              |
| `deck_size`                                 |                                             |
| `accumulated_opening_hand_size`             | Sum across trials                           |
| `accumulated_opening_hand_land_count`       | Sum across trials                           |
| `deck_average_cmc`                          | Non-land average CMC                        |
| `total_land_counts`                         | `ManaColorCount`                            |
| `basic_land_counts` … `pathway_land_counts` | Per land-kind mana counts                   |
| `other_land_counts`                         | Other / forced lands                        |
| `non_land_counts`                           | Non-land mana-cost tallies                  |

Land-kind count fields: `basic_`, `tap_`, `check_`, `shock_`, `fast_`, `slow_`, `battle_`, `turn_`, `surveil_`, `bounce_`, `triome_`, `cycling_`, `pain_`, `fetch_`, `canopy_`, `pathway_`, `other_`, `non_land_` (each a `ManaColorCount`).

## See also

- [Run](../entities/run.md)
- [Src](../entities/src.md)
- [Streaming progress](streaming-progress.md)
- [Monte Carlo simulation](monte-carlo-simulation.md)
