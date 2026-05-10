# 2026-05-10 — Schema distribution fix

## Task

`@open-form-spec/runner` resolved `schema.json` via a relative path that pointed to the monorepo root. This worked in development but broke for users who installed the package from npm.

## Investigation

`getSchemaPath()` in `packages/runner/src/runner.ts` used:

```typescript
resolve(thisDir, "../../../schema.json")
```

From `packages/runner/dist/runner.js` this correctly reaches the repo root. From `node_modules/@open-form-spec/runner/dist/runner.js` it resolves to `node_modules/schema.json` — which does not exist.

Three options were considered: ship the schema with the runner package, fetch it from a GitHub raw URL at runtime, or create a separate `@open-form-spec/schema` package.

The GitHub URL approach introduces a network dependency at every `ofs` invocation (breaks offline/CI, version drift risk). A separate package adds publish overhead for a single file. Shipping with the runner is the minimal correct fix with no API changes.

A second concern was raised: how do users reference the schema in their `.ofs.yaml` modelines for IDE intellisense? This is a separate consumer. The answer is a versioned GitHub raw URL — the standard pattern used by Kubernetes, GitHub Actions, etc. — fetched once and cached by the editor.

## Changes

### `packages/runner/src/runner.ts`
- Updated `getSchemaPath()` to use `"../schema.json"` (one level up from `dist/`).

### `packages/runner/package.json`
- Build script: added `cp ../../schema.json .` before `tsc` to copy the schema from the repo root into the runner package root.
- Clean script: added `schema.json` so it is removed on clean.
- `files`: added `"schema.json"` so it is included in the published package.

### `.gitignore`
- Added `packages/runner/schema.json` — it is a build artifact, not a source file.

### `docs/02-spec-format.md`
- Replaced the `path/to/schema.json` placeholder with the real versioned GitHub raw URL pattern.

### `docs/03-architecture.md`
- Added a note explaining the two purposes of `schema.json`: IDE intellisense (GitHub URL) and runtime validation (bundled in runner).

## Trade-offs

- The schema is duplicated at runtime (repo root + runner dist), but the repo root copy is the source of truth and the runner copy is always a fresh build artifact.
- Users must update the tag in their modeline when upgrading. This is intentional — it keeps intellisense in sync with the installed version.
