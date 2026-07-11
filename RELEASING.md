# Releasing `@lggarrison/landlord-ts`

Day-to-day work happens on **`develop`**; releases are cut from **`main`**. Releases are **automated** by [`.github/workflows/release.yml`](.github/workflows/release.yml): when you push a `vX.Y.Z` tag whose commit is on `main`, the workflow runs `release:check`, publishes to the **npm registry** (Trusted Publishing / OIDC), creates a **GitHub Release**, and merges `main` back into `develop`.

## Quick reference

|        | Link                                                  |
| ------ | ----------------------------------------------------- |
| npm    | https://www.npmjs.com/package/@lggarrison/landlord-ts |
| GitHub | https://github.com/lggarrison/landlord-ts             |

### Cutting a release

On `develop`, bump the version and push. Open a PR into `main` (CI must pass; use a **merge commit**, not squash). After the PR merges, push the tag:

```bash
git checkout develop && git pull
npm version patch -m "Release %s"   # or minor / major
# Update CHANGELOG.md [Unreleased] → dated section, commit if needed
git push origin develop
# open PR develop → main, merge with "Create a merge commit"
git checkout main && git pull
git push origin v0.1.1   # replace with the version you just bumped to
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

### npm org and Trusted Publishing

1. Ensure the **`@lggarrison`** organization exists on [npmjs.com](https://www.npmjs.com/) and you can publish scoped packages.
2. Create the empty package (or publish once) with public access — `publishConfig.access` is already `"public"` in `package.json`.
3. Configure **Trusted Publishing** for `@lggarrison/landlord-ts`:
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

1. `npm deprecate @lggarrison/landlord-ts@x.y.z "reason"`
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
