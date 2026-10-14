# Releasing `landlord-ts`

Day-to-day work happens on **`develop`**; releases are cut from **`main`**. Releases are **automated** by [`.github/workflows/release.yml`](.github/workflows/release.yml): when a `vX.Y.Z` tag on `main` is released, the workflow runs `release:check`, publishes to the **npm registry** (Trusted Publishing / OIDC), creates a **GitHub Release**, and merges `main` back into `develop`.

## Quick reference

|        | Link                                      |
| ------ | ----------------------------------------- |
| npm    | https://www.npmjs.com/package/landlord-ts |
| GitHub | https://github.com/lggarrison/landlord-ts |

### Card-data / quick release (GitHub Actions)

Use this path to ship a refreshed `data/all_cards.json.gz` (or any pending `develop` work) to npm:

1. Ensure the latest card fix / card-update PR is merged into **`develop`** (or leave **Refresh cards** enabled below).
2. Actions → **Prepare release** → Run workflow (`bump`: usually `patch`; `refresh_cards`: `true` to run `card-update` on the runner).
3. Merge the opened **`release/vX.Y.Z` → `main`** PR with **Create a merge commit** (not squash).
4. **Tag release** creates `vX.Y.Z` and starts **Release**, which publishes to npm and syncs `main` → `develop`.

Workflows: [`.github/workflows/prepare-release.yml`](.github/workflows/prepare-release.yml), [`.github/workflows/tag-release.yml`](.github/workflows/tag-release.yml), [`.github/workflows/release.yml`](.github/workflows/release.yml).

### Cutting a release (manual)

On `develop`, bump the version and push. Open a PR into `main` (CI must pass; use a **merge commit**, not squash). After the PR merges, either push the tag yourself or rely on **Tag release** (it tags when `package.json` has no matching `v*` tag):

```bash
git checkout develop && git pull
npm version patch -m "Release %s"   # or minor / major
# Update CHANGELOG.md [Unreleased] → dated section, commit if needed
git push origin develop
# open PR develop → main, merge with "Create a merge commit"
git checkout main && git pull
git push origin v0.1.1   # optional if Tag release is enabled
```

CI handles npm publish, the GitHub Release, and syncing `main` into `develop`.

## Branching model

- **`develop`** — integration branch. Feature branches merge here.
- **`main`** — release branch. Merge `develop` into `main` (via PR) when ready to ship, then push the release tag.
- **After each release** — `main` is merged back into `develop` (automated).

### Branch protection

| Branch        | Rules                                                               |
| ------------- | ------------------------------------------------------------------- |
| **`develop`** | Block deletion and force-push                                       |
| **`main`**    | Block deletion and force-push; **PR required**; CI matrix must pass |

**Tag pushes are not blocked.** Use a **merge commit** when merging the release PR so the tagged commit remains on `main`.

## One-time setup (maintainers)

### npm Trusted Publishing

1. Ensure you can publish unscoped packages on [npmjs.com](https://www.npmjs.com/) under your account.
2. Create the empty package (or publish once) — unscoped packages are public by default; `publishConfig.access` in `package.json` is harmless if left as `"public"`.
3. Configure **Trusted Publishing** for `landlord-ts`:
   - npm → package → **Trusted Publisher**
   - GitHub repository: `lggarrison/landlord-ts`
   - Workflow: `release.yml`
   - Environment: (leave empty unless you use one)
4. No long-lived `NPM_TOKEN` is required when OIDC Trusted Publishing is configured. The release job uses `id-token: write`.

### GitHub

- Enable Actions for the repository.
- Configure branch rulesets as in the table above.
- First push of `develop` and `main` must succeed before tagging.

## Local gates before tagging

```bash
npm run release:check
npm pack
# optional: install the .tgz in a throwaway folder and call run()
```

## Rollback

If a bad version ships:

1. `npm deprecate landlord-ts@x.y.z "reason"`
2. Fix on `develop`, cut a new patch release through the normal path
3. Do **not** unpublish except within npm’s allowed window and policy

## Manual fallbacks

If the release workflow fails after the tag is pushed:

```bash
npm run release:check
npm publish --access public
gh release create vX.Y.Z --generate-notes --verify-tag
# then merge main into develop manually or via PR
```
