---
type: concept
title: GitHub repo hygiene
last_updated: 2026-10-14T20:40:00Z
tags: [github, process]
related: [entities/src.md, concepts/card-pipeline.md]
status: active
summary: Branch model — feature PRs into develop; main only for releases.
code_refs:
  [
    CONTRIBUTING.md,
    RELEASING.md,
    .github/workflows/ci.yml,
    .github/workflows/release.yml,
    .github/workflows/card-update.yml,
    .github/workflows/prepare-release.yml,
    .github/workflows/tag-release.yml,
  ]
---

# GitHub repo hygiene

Day-to-day integration happens on **`develop`**. **`main`** is release-only.

## Branch model

```mermaid
flowchart LR
  feature[feature/chore branch]
  develop[develop]
  main[main]
  feature -->|"PR + merge"| develop
  develop -->|"release PR only"| main
  main -->|"post-release sync"| develop
```

| Branch                       | Role                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `develop`                    | Default branch. All feature, fix, and chore PRs target here.      |
| `main`                       | Release branch. Merge from `develop` only when cutting a release. |
| `feat/*`, `fix/*`, `chore/*` | Short-lived branches off `develop`.                               |

## Everyday work

1. Branch off latest `develop` (e.g. `feat/board-aware-lands`).
2. Open a PR with **base = `develop`** (never `main`).
3. Merge when CI is green.
4. Delete the feature branch after merge.

Automated card refreshes (`.github/workflows/card-update.yml`) open PRs into `develop` on a `chore/card-update` branch. To publish that data on npm, use **Prepare release** (see [Card pipeline](card-pipeline.md) and `RELEASING.md`).

## Releases

Follow `RELEASING.md`. Quick path:

1. Actions → **Prepare release** (optional Scryfall refresh + version/changelog bump on a `release/vX.Y.Z` branch from `develop`).
2. Merge **`release/vX.Y.Z` → `main`** with a **merge commit** (not squash).
3. **Tag release** creates `vX.Y.Z` and dispatches **Release** (npm publish + sync `main` → `develop`).

Manual path: bump on `develop`, PR into `main`, tag (or rely on Tag release).

Do not land feature work directly on `main`.

## Protection (maintainers)

| Branch    | Rules                                                        |
| --------- | ------------------------------------------------------------ |
| `develop` | Block deletion and force-push; prefer PR + CI                |
| `main`    | Block deletion and force-push; **PR required**; CI must pass |

## See also

- [Src](../entities/src.md)
- [Card pipeline](card-pipeline.md)

Human docs (repo root): `CONTRIBUTING.md`, `RELEASING.md`.
