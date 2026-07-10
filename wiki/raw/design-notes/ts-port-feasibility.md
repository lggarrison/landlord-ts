# Pure TypeScript landlord npm package

Source design note for the landlord-ts port.

## Decision

No WASM. Port the simulator to TypeScript and publish/consume it as a normal npm package.

## Public API

```ts
import { run } from '@lggarrison/landlord';
run({ code, runs, on_the_play, mulligan_down_to, mulligan_on_lands, acceptable_hand_list });
```

## Three fixes from Rust feature branches

1. DFC `M=auto` via `otherFacesByName`
2. TapLand-only enters-tapped delay in auto-tap
3. Scryfall JSONL bulk-data card update pipeline
