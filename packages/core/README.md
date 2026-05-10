# @open-form-spec/core

YAML parser and runtime field state resolver for [Open Form Spec](../../README.md).

## Install

```bash
npm install @open-form-spec/core
```

## API

### `parseOFS(yaml)`

Parses an `.ofs.yaml` file string into an `OFSDocument`.

```typescript
import { parseOFS } from "@open-form-spec/core";
import { readFileSync } from "node:fs";

const doc = parseOFS(readFileSync("registration.ofs.yaml", "utf8"));
// doc.section, doc.fields, doc.imports, ...
```

### `resolveFieldStates(input)`

Evaluates all `when` conditions against live form values and context to produce a flat map of field states.

```typescript
import { resolveFieldStates } from "@open-form-spec/core";

const states = resolveFieldStates({
  spec: doc,
  values: { accountType: "BUSINESS" },
  context: {},
  openApiEnums: {},
});
// states["companyName"] === "required"
// states["email"] === "required"
```

#### `ResolveInput`

| Field | Type | Description |
|-------|------|-------------|
| `spec` | `OFSDocument` | Parsed OFS document |
| `values` | `Record<string, unknown>` | Current form field values |
| `context` | `Record<string, unknown>` | External context values |
| `openApiEnums` | `Record<string, string[]>` | Enum values used in `in`/`notIn` conditions |

#### `ResolvedFieldStates`

`Record<string, FieldState>` — flat map of field path to its resolved `"required" | "optional" | "forbidden"` state.

## Notes

This package is used by `@open-form-spec/runner` at build time and can be used directly in browser or server runtimes to evaluate field states without a build step.
