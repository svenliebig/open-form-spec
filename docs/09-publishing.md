# Publishing

OFS uses [Changesets](https://github.com/changesets/changesets) to manage versioning and npm publishing. All packages release together at the same version (fixed versioning group).

## How It Works

The release process has two steps:

1. **Changeset files** — markdown files in `.changeset/` that describe what changed and what kind of version bump is needed. You create these while developing.
2. **Version PR** — when changesets are merged to `main`, the GitHub Actions release workflow opens a pull request that bumps all package versions and updates changelogs. Merging that PR triggers the actual npm publish.

```
feature branch  ──►  main  ──►  Version PR  ──►  npm publish
  (+ changeset)       │          (auto-created)    (on merge)
                      ▼
                  CI passes
```

## Adding a Changeset

When you make a change that should result in a new release, add a changeset:

```bash
npx changeset
```

The CLI will ask:

1. **Which packages to bump** — select any package (all packages release together, so the choice only affects the bump type determination)
2. **Bump type** — `major`, `minor`, or `patch`
3. **Summary** — a short description of the change (appears in the changelog)

This creates a file like `.changeset/fuzzy-dogs-eat.md`:

```markdown
---
"@open-form-spec/core": minor
---

Add support for `context` conditions in field state rules.
```

Commit this file together with your code changes and open a PR to `main`.

### Bump type guide

| Change | Bump |
|--------|------|
| Breaking API change | `major` |
| New feature, backwards compatible | `minor` |
| Bug fix, docs, internal change | `patch` |

## The Release Cycle

Once changesets land on `main`:

1. The release workflow detects pending changesets and opens (or updates) a **"Version Packages" pull request**.
2. That PR bumps all package versions in `package.json`, updates `CHANGELOG.md` files, and deletes the consumed changeset files.
3. A maintainer reviews and merges the Version PR.
4. The release workflow runs again, finds no pending changesets, builds all packages, and publishes to npm using OIDC trusted publishing (no `NPM_TOKEN` required).

## Versioning Rules

All six packages share a single version number (configured as a `fixed` group in `.changeset/config.json`):

- `@open-form-spec/types`
- `@open-form-spec/plugin`
- `@open-form-spec/core`
- `@open-form-spec/validator`
- `@open-form-spec/runner`
- `@open-form-spec/plugin-yup`

A `patch` bump to any one package bumps all of them to the same new version.

## Manual Release (emergency)

If the automated workflow cannot run, a maintainer can publish manually:

```bash
npm ci
npm run build
npm run release   # runs: changeset publish
```

This requires npm credentials with publish access to the `@open-form-spec` scope.
