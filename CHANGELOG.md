# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `runAsync` / `simulationFromConfigAsync` with optional `on_progress`, `batch_size`, and `AbortSignal` for streaming hosts (e.g. Next.js SSE)
- Wiki docs for the mtgoncurve API contract and SSE streaming progress pattern
- `RunValidationError` and exported `DeckcodeError` for typed input validation (hosts can map to HTTP 400)
- `RunProgress.phase` (`simulating` | `scoring`) so UIs can show scoring instead of stalling at 100%
- Types-only `SimulateStreamEvent` union for Next.js SSE Pattern A

### Changed

- Renamed npm package from `@lggarrison/landlord` to `@lggarrison/landlord-ts` (matches the GitHub repo)
- Renamed GitHub repository from `landord-ts` to `landlord-ts`
- **Breaking:** `RunProgress` now requires `phase`; update `on_progress` callbacks/typings accordingly

## [0.1.0] - 2026-07-10

### Added

- Initial public release of `@lggarrison/landlord-ts`
- Pure TypeScript Monte Carlo on-curve simulator (`run()` API matching mtgoncurve.com)
- Arena decklist parsing with `X=`, `T=`, `M=`, and `M=auto` modifiers
- TapLand-only enters-tapped delay in auto-tap; Check/Shock immediate
- London and Never mulligan strategies
- Scryfall card-update pipeline writing `data/all_cards.json.gz`
- Dual ESM/CJS build with TypeScript declarations
- Vitest suite (unit, auto-tap, deck, integration / Karsten-style smoke)

[Unreleased]: https://github.com/lggarrison/landlord-ts/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lggarrison/landlord-ts/releases/tag/v0.1.0
