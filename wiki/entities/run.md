---
type: entity
title: Run
last_updated: 2026-07-11T01:30:00Z
tags: [run, src]
related: [concepts/mtgoncurve-api.md, concepts/streaming-progress.md, entities/src.md]
status: active
summary: Public run() / runAsync() façade matching mtgoncurve Input/Output.
code_refs: [src/run.ts, src/index.ts]
---

# Run

`run(input)` parses a decklist, configures London mulligan, simulates, and returns snake_case output (`card_observations`, land-type mana counts including fast/slow/turn, etc.).

`runAsync(input)` is the same façade with sequential batches, optional `on_progress` / `batch_size` / `signal`, and event-loop yields for streaming hosts. See [Streaming progress](../concepts/streaming-progress.md).

Optional inputs: `starting_hand_size`, `epsilon` (early-stop), `parallel` (sync `run` only), `seed`.

## See also

- [mtgoncurve API](../concepts/mtgoncurve-api.md)
- [Streaming progress](../concepts/streaming-progress.md)
- [Src](src.md)
