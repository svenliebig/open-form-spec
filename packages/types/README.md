# @open-form-spec/types

Shared TypeScript type definitions for [Open Form Spec](../../README.md). Zero runtime code — types only.

## Install

```bash
npm install @open-form-spec/types
```

## Exports

| Type | Description |
|------|-------------|
| `OFSDocument` | Root structure of a parsed `.ofs.yaml` file |
| `FieldDefinition` | Per-field state definition with optional `when` conditions |
| `FieldState` | `"required" \| "optional" \| "forbidden"` |
| `WhenEntry` | Condition entry — either `SimpleWhen` or `CompoundWhen` |
| `SimpleWhen` | Single condition (`field`, `is`, `in`, etc.) |
| `CompoundWhen` | Multi-condition with `all: []` |
| `ConditionExpr` | Individual expression inside a `CompoundWhen` |
| `OpenAPISchemas` | OpenAPI schema properties keyed by schema name then property name |
| `OpenAPIPropertyInfo` | Type/format/ref info for a single OpenAPI property |

## Usage

```typescript
import type { OFSDocument, FieldDefinition, WhenEntry } from "@open-form-spec/types";
```

This package is consumed by every other `@open-form-spec/*` package. If you are writing a custom plugin you likely want `@open-form-spec/plugin` instead, which re-exports the types you need alongside the plugin contract.
