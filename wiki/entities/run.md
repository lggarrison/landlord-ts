---
type: entity
title: Run
last_updated: 2026-07-11T03:54:00Z
tags: [run, src]
related:
  [concepts/landlord-ts-api.md, concepts/streaming-progress.md, entities/src.md, entities/deck.md]
status: active
summary: Public run() / runAsync() façade with flattened RunOutput, RunValidationError, and phased progress.
code_refs: [src/run.ts, src/index.ts, src/observations-report.ts]
---

# Run

`run(input)` parses a decklist, configures London mulligan, simulates, and returns a flattened camelCase `RunOutput`: per-card on-curve stats (`cards`), ranked insights (`weakestOnCurve`, `colorConstrained`, `drawDependent`), simplified `landCounts`, and land-kind mana tallies.

`runAsync(input)` is the same façade with sequential batches, optional `onProgress` / `batchSize` / `signal`, and event-loop yields for streaming hosts. Progress ticks include `phase: 'simulating' | 'scoring'`. See [Streaming progress](../concepts/streaming-progress.md).

Invalid inputs throw `RunValidationError` (deck parse failures keep `DeckcodeError` as `cause`). Exported SSE union: `SimulateStreamEvent`.

Optional inputs: `startingHandSize`, `epsilon` (early-stop), `parallel` (sync `run` only), `seed`.

## See also

- [landlord-ts API](../concepts/landlord-ts-api.md)
- [Streaming progress](../concepts/streaming-progress.md)
- [Src](src.md)
- [Deck](deck.md)
