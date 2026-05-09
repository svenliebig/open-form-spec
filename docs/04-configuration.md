# Configuration

## Config File

OFS uses a JavaScript config file in your project root. The runner looks for `ofs.config.js` or `ofs.config.mjs` in the current working directory.

```javascript
// ofs.config.js
import { defineConfig } from "@ofs/plugin";
import { yupGenerator } from "@ofs/plugin-yup";

export default defineConfig({
  specs: "src/specs/**/*.ofs.yaml",
  openapi: {
    backend: "src/openapi/merged.yaml",
  },
  plugins: [
    yupGenerator({
      output: "src/generated/ofs",
    }),
  ],
});
```

## Options

### `specs`

**Required.** Glob pattern for `.ofs.yaml` files.

```javascript
specs: "src/main/resources/open-form-spec/**/*.ofs.yaml"
```

The runner scans the base directory recursively for files ending in `.ofs.yaml`.

### `openapi`

**Optional.** Map of source names to OpenAPI spec file paths.

```javascript
openapi: {
  backend: "src/main/resources/openapi/v1/merged.yaml",
  cms: "../cms/openapi.yaml",
}
```

The keys match the import prefixes in your `.ofs.yaml` files. If your OFS spec says `AccountType: "backend#AccountType"`, the `backend` key must be present here.

Each OpenAPI spec is parsed for:
- **Enum definitions** — validated against enum references in conditions
- **Schema properties** — field type info available to plugins for code generation

### `plugins`

**Optional.** Array of plugins to run, in order.

```javascript
plugins: [
  yupGenerator({ output: "src/generated/ofs" }),
  javaTestGenerator({ output: "src/test/java/generated" }),
]
```

Plugins are called sequentially after validation passes. Each plugin receives all parsed specs and OpenAPI data.

### `hooks`

**Optional.** Lifecycle hooks for running commands at specific points during generation.

```javascript
hooks: {
  afterAllFilesWrite: "npm exec eslint -- --fix --max-warnings 0 src/generated/ofs",
}
```

Accepts a single command string or an array of commands executed sequentially:

```javascript
hooks: {
  afterAllFilesWrite: [
    "npm exec eslint -- --fix --max-warnings 0 src/generated/ofs",
    "npm exec prettier -- --write src/generated/ofs",
  ],
}
```

Hooks only run when generation succeeds (no plugin errors). Commands are executed with the config file directory as working directory.

## Commands

```bash
# Run from the directory containing ofs.config.js
npx ofs validate                    # validate specs only
npx ofs generate                    # validate + run all plugins
npx ofs generate --plugin yup       # run only a specific plugin
npx ofs generate --config path.js   # use a specific config file
```
