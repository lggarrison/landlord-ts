---
type: entity
title: Run
last_updated: 2026-07-11T02:15:00Z
tags: [run, src]
related: [concepts/mtgoncurve-api.md, concepts/streaming-progress.md, entities/src.md]
status: active
summary: Public run() / runAsync() façade with flattened on-curve RunOutput.
code_refs: [src/run.ts, src/index.ts, src/observations-report.ts]
---

# Run

`run(input)` parses a decklist, configures London mulligan, simulates, and returns a flattened snake_case `RunOutput`: per-card on-curve stats (`cards`), ranked insights (`weakest_on_curve`, `color_constrained`, `draw_dependent`), simplified `land_counts`, and land-kind mana tallies.

`runAsync(input)` is the same façade with sequential batches, optional `on_progress` / `batch_size` / `signal`, and event-loop yields for streaming hosts. See [Streaming progress](../concepts/streaming-progress.md).

Optional inputs: `starting_hand_size`, `epsilon` (early-stop), `parallel` (sync `run` only), `seed`.

## See also

- [mtgoncurve API](../concepts/mtgoncurve-api.md)
- [Streaming progress](../concepts/streaming-progress.md)
- [Src](src.md)
