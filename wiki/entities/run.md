---
type: entity
title: Run
last_updated: 2026-07-11T02:10:00Z
tags: [run, src]
related: [concepts/mtgoncurve-api.md, concepts/streaming-progress.md, entities/src.md]
status: active
summary: Public run() / runAsync() façade matching mtgoncurve Input/Output.
code_refs: [src/run.ts, src/index.ts, src/observations-report.ts]
---

# Run

`run(input)` parses a decklist, configures London mulligan, simulates, and returns snake_case output (`card_observations`, `observations_report`, land-type mana counts including fast/slow/turn, etc.).

`card_observations` keeps the mtgoncurve raw counters. `observations_report` is a separate user-facing shape with per-card success/miss totals, failure-mode breakdown, and ranked lists (`weakest_on_curve`, `color_constrained`, `draw_dependent`). See [mtgoncurve API](../concepts/mtgoncurve-api.md).

`runAsync(input)` is the same façade with sequential batches, optional `on_progress` / `batch_size` / `signal`, and event-loop yields for streaming hosts. See [Streaming progress](../concepts/streaming-progress.md).

Optional inputs: `starting_hand_size`, `epsilon` (early-stop), `parallel` (sync `run` only), `seed`.

## See also

- [mtgoncurve API](../concepts/mtgoncurve-api.md)
- [Streaming progress](../concepts/streaming-progress.md)
- [Src](src.md)
