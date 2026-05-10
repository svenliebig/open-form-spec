# @ofs/plugin

Plugin contract types and `defineConfig` helper for [Open Form Spec](../../README.md). Use this package when writing a custom plugin or authoring an `ofs.config.js`.

## Install

```bash
npm install @ofs/plugin
```

## Writing a plugin

```typescript
import type { OFSPlugin, OFSPluginFactory } from "@ofs/plugin";

interface MyOptions {
  output: string;
}

export const myPlugin: OFSPluginFactory<MyOptions> = (options) => ({
  name: "my-plugin",
  async run(ctx) {
    const files = ctx.specs.map((spec) => ({
      path: `${options.output}/${spec.section}.ts`,
      content: `// generated from ${spec.section}`,
    }));
    return { files };
  },
});
```

## Configuring a project

```javascript
// ofs.config.js
import { defineConfig } from "@ofs/plugin";
import { yupGenerator } from "@ofs/plugin-yup";

export default defineConfig({
  specs: "src/specs/**/*.ofs.yaml",
  openapi: { api: "src/openapi.yaml" },
  plugins: [
    yupGenerator({ output: "src/generated/ofs" }),
  ],
});
```

## API

### `defineConfig(config)`

Identity function that provides TypeScript inference for `ofs.config.js`. Returns the config unchanged.

### `OFSPlugin`

```typescript
interface OFSPlugin {
  name: string;
  run(context: OFSPluginContext): Promise<OFSPluginResult>;
}
```

### `OFSPluginContext`

| Field | Type | Description |
|-------|------|-------------|
| `specs` | `OFSDocument[]` | All parsed `.ofs.yaml` documents |
| `openApiEnums` | `Record<string, Record<string, string[]>>` | Enum values keyed by source name then enum name |
| `openApiSchemas` | `Record<string, OpenAPISchemas>` | Schema properties keyed by source name |
| `rootDir` | `string` | Absolute path to the directory containing `ofs.config.js` |

### `OFSPluginResult`

| Field | Type | Description |
|-------|------|-------------|
| `files` | `GeneratedFile[]` | Files to write — paths relative to `rootDir` unless absolute |
| `errors` | `PluginError[]` | Errors that fail the build |
| `warnings` | `string[]` | Warnings that are logged but do not fail |
