# @open-form-spec/runner

CLI and programmatic runner for [Open Form Spec](../../README.md). Loads your `ofs.config.js`, validates specs, and orchestrates plugins.

## Install

```bash
npm install --save-dev @open-form-spec/runner
```

## CLI

```bash
npx ofs generate          # validate specs + run all plugins
npx ofs validate          # validate specs only (no generation)
npx ofs generate -p yup   # run only the plugin named "yup"
npx ofs generate -c path/to/ofs.config.js
```

### Commands

| Command | Description |
|---------|-------------|
| `generate` | Validates all specs against OpenAPI, then runs every configured plugin |
| `validate` | Validates specs only — no plugin execution, no file writes |

### Options

| Flag | Description |
|------|-------------|
| `-c, --config <path>` | Path to config file (default: `ofs.config.js`) |
| `-p, --plugin <name>` | Run only the named plugin |
| `-h, --help` | Show help |

## Programmatic API

```typescript
import { run, loadConfig } from "@open-form-spec/runner";

const { config, rootDir } = await loadConfig();

const result = await run({
  config,
  rootDir,
  command: "generate",
});

if (!result.success) {
  process.exit(1);
}
```

### `run(options)`

| Option | Type | Description |
|--------|------|-------------|
| `config` | `OFSConfig` | Resolved configuration object |
| `rootDir` | `string` | Absolute path to the config root |
| `command` | `"generate" \| "validate"` | Which operation to run |
| `pluginFilter` | `string` (optional) | Run only the named plugin |

### `loadConfig(path?)`

Loads and resolves `ofs.config.js` (or the given path). Returns `{ config, rootDir }`.
