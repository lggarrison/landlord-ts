---
type: source
title: 'TS port feasibility plan'
last_updated: 2026-07-12T19:35:00Z
tags: [design, port]
related: [entities/src.md, concepts/landlord-ts-api.md]
status: active
summary: Summary of the pure-TypeScript landlord port decisions (no WASM, gzipped JSON card DB, landlord-ts run API).
---

# TS port feasibility plan

Ingested from the Cursor feasibility plan for porting Rust landlord to `landlord-ts`.

## Key decisions

- Pure TypeScript npm package — **no WASM**
- Ship `data/all_cards.json.gz` (not bincode)
- Public API: `run(input)` matching the landlord-ts Input/Output contract
- Include three Rust feature-branch fixes: DFC `M=auto`, TapLand-only delay, Scryfall JSONL pipeline
- Vitest + tsup dual ESM/CJS; Node 24 pin / engines `>=22`
- Branching: PRs → `develop`; releases from `main`

## See also

- [Src](../entities/src.md)
- [landlord-ts API](../concepts/landlord-ts-api.md)
