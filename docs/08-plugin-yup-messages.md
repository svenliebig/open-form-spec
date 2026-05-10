# Plugin Yup: Validation Messages

## Overview

The `messages` option allows configuring custom validation messages for specific field types and states. Messages are injected as arguments to state calls (e.g., `.required(message)`) in the generated schema.

## Configuration

```javascript
yupGenerator({
  output: "src/generated/ofs",
  enumImport: "@/api/generated/backend/index.schemas",
  messages: {
    "string:enum": {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_OPTION",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
    "string": {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_TEXT",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
  },
})
```

## Message Keys

Message keys follow the same resolution system as `types` keys, with one addition:

| Key | Matches |
|-----|---------|
| `"string"` | All fields with OpenAPI type `string` |
| `"string:date"` | Fields with type `string` and format `date` |
| `"string:enum"` | Fields with a `$ref` to an enum schema (special key) |
| `"number"` | All fields with OpenAPI type `number` |
| `"boolean"` | All fields with OpenAPI type `boolean` |

Resolution priority (most specific wins): `type:format` / `type:enum` > `type`.

## Supported States

Messages can be configured for any field state:

| State | Effect |
|-------|--------|
| `required` | Passed as argument to `.required(message)` |
| `optional` | Passed as argument to `.optional(message)` |

## Generated Output

Given the configuration above and an enum field `accountType` with state `required`:

```typescript
import { VALIDATION_MESSAGES } from "@/constants/validation";

// In the schema shape:
accountType: fields.accountType.required(VALIDATION_MESSAGES.REQUIRED_OPTION),
```

## Message Override Interface

Each message entry uses the same `TypeOverride` structure:

| Property | Type | Description |
|----------|------|-------------|
| `factory` | `string` | Expression for the message (e.g., `"VALIDATION_MESSAGES.REQUIRED_OPTION"`) |
| `import` | `{ name, from }` | Import to add to the generated file. Omit if already available. |
