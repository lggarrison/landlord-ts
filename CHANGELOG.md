# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-07-11

### Added

- `parseDecklist()` for non-throwing decklist validation (UI-friendly result type)
- `DeckcodeError.unknownCardNames` / `unknownCardName` when cards are missing from the collection
- Deck parse coverage for malformed / multi-unknown Arena lists

### Changed

- Deck parse collects all unknown card names before throwing (instead of failing on the first)
- Arena `About` section is skipped like `Commander` / `Companion`
- Card-name lookup uses `localeCompare` for stable binary search ordering
- Renamed wiki concept `mtgoncurve-api` → `landlord-ts-api` (and related docs/keywords)

## [1.0.0] - 2026-07-11

First stable npm registry publish of `@lggarrison/landlord-ts`.

### Added

- Pure TypeScript Monte Carlo on-curve simulator (`run()` API)
- `runAsync` / `simulationFromConfigAsync` with optional `onProgress`, `batchSize`, and `AbortSignal` for streaming hosts (e.g. Next.js SSE)
- `RunProgress.phase` (`simulating` | `scoring`) so UIs can show scoring instead of stalling at 100%
- `RunValidationError` and exported `DeckcodeError` for typed input validation (hosts can map to HTTP 400)
- Types-only `SimulateStreamEvent` union for Next.js SSE Pattern A
- Arena decklist parsing with `X=`, `T=`, `M=`, and `M=auto` modifiers
- TapLand-only enters-tapped delay in auto-tap; Check/Shock immediate
- London and Never mulligan strategies
- Expanded land-kind modeling (fast/slow/battle/turn/surveil/bounce/triome/cycling/pain/fetch/canopy/pathway, colorless lands)
- Flattened on-curve observation report (`cards`, ranked insights, land tallies)
- Scryfall card-update pipeline writing `data/all_cards.json.gz`
- Dual ESM/CJS build with TypeScript declarations
- Vitest suite (unit, auto-tap, deck, integration / Karsten-style smoke)
- Wiki docs for the landlord-ts API contract and SSE streaming progress pattern

### Changed

- Renamed npm package from `@lggarrison/landlord` to `@lggarrison/landlord-ts` (matches the GitHub repo)
- Renamed GitHub repository from `landord-ts` to `landlord-ts`
- Public `RunInput` / `RunOutput` / report fields use camelCase
- `RunProgress` requires `phase`

[Unreleased]: https://github.com/lggarrison/landlord-ts/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/lggarrison/landlord-ts/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/lggarrison/landlord-ts/releases/tag/v1.0.0
