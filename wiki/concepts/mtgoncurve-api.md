---
type: concept
title: mtgoncurve API
last_updated: 2026-07-10T20:05:00Z
tags: [api]
related: [entities/run.md, entities/src.md]
sources: [sources/ts-port-feasibility.md]
status: active
summary: Snake_case run() Input/Output contract compatible with mtgoncurve.com.
code_refs: [src/run.ts]
---

# mtgoncurve API

```ts
run({
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

Returns `card_observations`, `land_counts`, deck stats, and per-land-type `ManaColorCount` fields (`basic_`, `tap_`, `check_`, `shock_`, `fast_`, `slow_`, `battle_`, `turn_`, `surveil_`, `bounce_`, `triome_`, `cycling_`, `pain_`, `fetch_`, `canopy_`, `pathway_`, `other_`, `non_land_`).

## See also

- [Run](../entities/run.md)
- [Src](../entities/src.md)
