# Contributing to `landlord-ts`

Thanks for your interest in contributing! This project is a TypeScript library (ESM + CJS) that ports the Rust landlord Monte Carlo simulator. The notes below cover local setup, the branch model, and the checks your change needs to pass.

## Prerequisites

- Node.js **24** for development (see [`.nvmrc`](.nvmrc); run `nvm use` or `fnm use` after clone). The published package supports Node `>=22` (`engines.node`), and CI tests both 22 and 24 on Linux and Windows.
- npm (bundled with Node)

## Setup

```bash
git clone https://github.com/lggarrison/landlord-ts.git
cd landlord-ts
nvm use   # or: fnm use
npm install
```

`npm install` runs the `prepare` script, which sets up Husky git hooks (local checkout only). Card data is already shipped in `data/all_cards.json.gz`; regenerate with `npm run card-update` when needed.

## Branch model

- `develop` is the default integration branch and the target for **all** feature, fix, and chore pull requests.
- `main` is the release branch only. Do **not** open feature PRs into `main`.
- After each release, `main` is merged back into `develop` (automated by the release workflow; see [RELEASING.md](RELEASING.md)).

Branch off `develop`, and open your pull request against `develop`. Longer notes live in the wiki: [GitHub repo hygiene](wiki/concepts/github-repo-hygiene.md).

### Branch protection (maintainers)

| Branch        | Rules                                                        |
| ------------- | ------------------------------------------------------------ |
| **`develop`** | Block deletion and force-push                                |
| **`main`**    | Block deletion and force-push; **PR required**; CI must pass |

Use a **merge commit** (not squash) when merging release PRs into `main` so the release tag SHA stays on `main`.

## Everyday commands

| Command                 | What it does                                      |
| ----------------------- | ------------------------------------------------- |
| `npm run build`         | Bundle TypeScript to `dist/` (tsup)               |
| `npm test`              | Run the Vitest suite                              |
| `npm run lint`          | Lint with ESLint                                  |
| `npm run lint:fix`      | Lint and auto-fix                                 |
| `npm run format`        | Format with Prettier                              |
| `npm run format:check`  | Verify formatting without writing                 |
| `npm run card-update`   | Regenerate `data/all_cards.json.gz` from Scryfall |
| `npm run wiki:lint`     | Lint the dogfooded `wiki/` vault                  |
| `npm run wiki:build`    | Regenerate `wiki/index.md` from frontmatter       |
| `npm run release:check` | Run every gate CI runs                            |

## Git hooks

Husky is configured for local development:

- **pre-commit** runs `lint-staged` (ESLint + Prettier on staged files, and wiki checks when `wiki/**` changes).
- **pre-push** runs `npm run wiki:check`.

Hooks are skipped automatically in CI and when the package is installed as a dependency.

## Before you open a PR

```bash
npm run release:check
```

If you edited any file under `wiki/`, also run `npm run wiki:build` and commit the regenerated `index.md`.

Fill out the pull request template and keep changes focused. Maintainers: see [RELEASING.md](RELEASING.md) for how to cut a release.

## Reporting bugs and requesting features

Use the issue templates under [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE). For security-sensitive reports, see [SECURITY.md](SECURITY.md).
