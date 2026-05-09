# 2026-05-09 — Add hooks support (afterAllFilesWrite)

## Task

Add lifecycle hooks to OFS config, similar to Orval's hooks system. Starting with `afterAllFilesWrite` to run commands (e.g. eslint) after all plugin files have been written.

## Investigation

- `OFSConfig` in `packages/plugin/src/index.ts` defines the config shape
- `packages/runner/src/runner.ts` handles the full pipeline: parse specs, validate, run plugins, write files
- Plugins return files; the runner writes them to disk — hooks belong in the runner after the write step

## Changes

- **`packages/plugin/src/index.ts`** — Added `OFSHooks` interface with `afterAllFilesWrite: string | string[]` and added `hooks?: OFSHooks` to `OFSConfig`
- **`packages/runner/src/runner.ts`** — After all plugin files are written (and only if no errors), executes `afterAllFilesWrite` commands sequentially via `execSync` with `cwd: rootDir` and `stdio: "inherit"`
- **`packages/runner/src/runner.test.ts`** — Three new tests: single command, array of commands, and skipping hooks on plugin errors
- **`docs/04-configuration.md`** — Documented the `hooks` option with examples

## Decisions

- Hooks only run when generation succeeds (no plugin errors) — failing builds should not trigger post-processing
- Commands run with `stdio: "inherit"` so users see linter/formatter output directly
- `cwd` is set to `rootDir` (config file directory) for consistent path resolution
- Supports both `string` and `string[]` for single or multiple sequential commands
