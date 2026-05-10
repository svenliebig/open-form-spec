# Yup Generator: Validation Messages

**Date:** 2026-05-10

**Task:** Add `messages` option to the yup generator to allow configuring custom validation messages per type key and field state.

## Investigation

- The yup generator already had a `types` option using a type key system (`"string"`, `"string:date"`) with priority resolution
- Enum fields (with `$ref`) only resolved to `["string"]` — no specific key existed for targeting enum fields
- Messages needed to flow into `.required()` / `.optional()` calls in simple fields, single `when` conditions, and multi `when` (lazy) conditions
- `emitSingleWhen` and `emitMultiWhen` did not receive `GeneratorContext`, needed parameter threading

## Changes

### `packages/plugin-yup/src/generator.ts`
- Added `messages` to `GeneratorContext`
- Extended `resolveTypeKeys` to return `["string:enum", "string"]` for `$ref` fields (new `type:enum` key)
- Added `resolveMessage()` for type-key-based message resolution
- Added `collectMessageImports()` for message import collection
- Updated import emission to deduplicate across type and message imports
- Updated `emitSimpleField`, `emitSingleWhen`, `emitMultiWhen`, and `stateCallback` to support messages

### `packages/plugin-yup/src/index.ts`
- Added `messages` to `YupGeneratorOptions`, passed through to generator

### Tests
- 4 new test suites in `order.test.ts`: enum messages, base string messages, priority resolution
- 1 new test suite in `checkout.test.ts`: messages in `when` condition callbacks
- 13 new tests total, all passing (46 total)

### Documentation
- `docs/08-plugin-yup-messages.md`: feature documentation

## Decisions

- `"string:enum"` added as a new type key in `resolveTypeKeys`, making it available for both `types` and `messages` resolution — consistent and backward compatible
- Messages reuse the `TypeOverride` interface (same `factory` + `import` shape) to keep the API consistent
- Nested fields naturally don't receive messages (no DTO property match), which is the correct behavior
