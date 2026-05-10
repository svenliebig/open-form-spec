# Plugins

## Overview

Plugins are functions that receive parsed OFS specs and produce output. They handle generation — the runner handles infrastructure.

A plugin is an object with a `name` and a `run` method:

```typescript
interface OFSPlugin {
  name: string;
  run(context: OFSPluginContext): Promise<OFSPluginResult>;
}
```

## Plugin Context

Every plugin receives the same context:

```typescript
interface OFSPluginContext {
  /** All parsed OFS spec documents. */
  specs: OFSDocument[];

  /** OpenAPI enums, keyed by source name. */
  openApiEnums: Record<string, Record<string, string[]>>;

  /** OpenAPI schema properties, keyed by source → schema → property. */
  openApiSchemas: Record<string, OpenAPISchemas>;

  /** Absolute path to the directory containing ofs.config.js. */
  rootDir: string;
}
```

### Accessing OpenAPI Info

Enum values for a source:
```typescript
const values = context.openApiEnums["api"]["AccountType"];
// ["PERSONAL", "BUSINESS", ...]
```

Property type info for a DTO field:
```typescript
const schemas = context.openApiSchemas["backend"];
const emailType = schemas["Registration"]["email"];
// { type: "string" }

const paymentType = schemas["Checkout"]["paymentMethod"];
// { ref: "PaymentMethod" }
```

## Plugin Result

Plugins return files to write, errors, and warnings:

```typescript
interface OFSPluginResult {
  /** Files to write. Paths are relative to rootDir unless absolute. */
  files?: GeneratedFile[];

  /** Errors that fail the build. */
  errors?: PluginError[];

  /** Warnings that get logged but don't fail. */
  warnings?: string[];
}
```

The runner writes files to disk. Plugins never touch the filesystem directly — this makes them pure functions that are easy to test.

## Writing a Plugin

A plugin is typically a factory function that takes options and returns the plugin object:

```typescript
import type { OFSPlugin } from "@open-form-spec/plugin";

interface MyPluginOptions {
  output: string;
}

export function myPlugin(options: MyPluginOptions): OFSPlugin {
  return {
    name: "my-plugin",
    async run(context) {
      const files = context.specs.map((spec) => ({
        path: `${options.output}/${spec.section}.ts`,
        content: generateCode(spec, context),
      }));

      return { files };
    },
  };
}

function generateCode(spec, context) {
  // Your generation logic here
  return `// Generated for ${spec.section}\n`;
}
```

### Using in Config

```javascript
import { defineConfig } from "@open-form-spec/plugin";
import { myPlugin } from "./my-plugin.js";

export default defineConfig({
  specs: "specs/**/*.ofs.yaml",
  plugins: [
    myPlugin({ output: "src/generated" }),
  ],
});
```

### Plugin Dependencies

For type information only, depend on `@open-form-spec/plugin` (which re-exports types from `@open-form-spec/types`). This is the only dependency a plugin needs for the API contract.

If your plugin needs the resolver (to evaluate field states), also depend on `@open-form-spec/core`.

## First-Party Plugins

| Plugin | Package | Description |
|--------|---------|-------------|
| yup | `@open-form-spec/plugin-yup` | Generates type-preserving yup schemas with enum support, format-aware factories, and full TypeScript inference |

See the [yup plugin documentation](./06-plugin-yup.md) for details.
