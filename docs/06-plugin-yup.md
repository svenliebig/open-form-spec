# Plugin: Yup

The yup plugin generates [yup](https://github.com/jquense/yup) validation schemas from OFS specs. It produces Layer 1 (field state) code that you combine with your hand-written Layer 2 (content validation). Types are fully preserved — including enum narrowing from `.oneOf()`.

## Setup

```javascript
// ofs.config.js
import { defineConfig } from "@ofs/plugin";
import { yupGenerator } from "@ofs/plugin-yup";

export default defineConfig({
  specs: "specs/**/*.ofs.yaml",
  openapi: { api: "openapi.yaml" },
  plugins: [
    yupGenerator({
      output: "src/generated/ofs",
      enumImport: "@/api/generated/backend/index.schemas",
    }),
  ],
});
```

Run `npx ofs generate` to produce one `.ofs.ts` file per spec section.

## Options

| Option | Type | Description |
|--------|------|-------------|
| `output` | `string` | Output directory for generated files, relative to config root |
| `types` | `Record<string, TypeOverride>` | Override yup schema factories per OpenAPI type or type:format (see [Custom Type Factories](#custom-type-factories)) |
| `enumImport` | `string` | Import path for OpenAPI enum types. When set, enum fields auto-generate `.oneOf(Object.values(EnumName))` (see [Enum Support](#enum-support)) |

## Generated Output

For a spec like:

```yaml
section: registration
dto: Registration

imports:
  enums:
    AccountType: "api#AccountType"

fields:
  email:
    state: required
  accountType:
    state: required
  nickname:
    state: optional
```

The plugin generates:

```typescript
// registration.ofs.ts (auto-generated)
import * as yup from "yup";
import { AccountType } from "@/api/generated/backend/index.schemas";

// Defaults as factory — deferred so yup.setLocale() runs before schema creation
export const registrationDefaults = () => ({
  email: yup.string(),
  accountType: yup.string().oneOf(Object.values(AccountType)),
  nickname: yup.string(),
});
export type RegistrationFields = ReturnType<typeof registrationDefaults>;

// Generic function — overrides preserve specific types through spread
export function registrationSchema<T extends Partial<RegistrationFields>>(
  overrides?: T,
) {
  const fields = { ...registrationDefaults(), ...overrides };

  return yup.object().shape({
    email: fields.email.required(),
    accountType: fields.accountType.required(),
    nickname: fields.nickname.optional(),
  });
}
```

## How It Works

The generated code uses three TypeScript features to preserve types:

1. **`ReturnType<typeof defaults>`** — the `Fields` type is derived from the defaults factory return type, so `.oneOf()` narrowing (e.g. `"PENDING" | "CONFIRMED" | "SHIPPED"`) is captured automatically. The factory is deferred so `yup.setLocale()` and custom message configuration runs before schema creation.
2. **Generic `<T extends Partial<Fields>>`** — when you pass overrides, TypeScript captures your specific types
3. **Object spread `{ ...defaults, ...overrides }`** — TypeScript preserves the override's type for each field, falling back to the default's type for fields not overridden

This means `InferType<typeof schema>` produces the correct narrowed types — enum fields show their actual values, not just `string`.

## Combining Layer 1 and Layer 2

### Layer 1 (generated)

Field presence rules. Handles `required()`, `optional()`, `strip()`, and `when()` conditions. Enum constraints are also generated. This is what the plugin produces — you never write this by hand.

### Layer 2 (hand-written)

Additional content validation beyond what the spec + OpenAPI provide. Only override fields where the generated default isn't enough:

```typescript
import { registrationSchema } from "./generated/ofs/registration.ofs";

// Only override what you need — defaults handle the rest
export const schema = registrationSchema({
  email: yup.string().email("Invalid email"),
  password: yup.string().min(8, "At least 8 characters"),
});
```

Fields you don't override keep their generated defaults (correct type, enum `.oneOf()`, format-specific factory).

### What Layer 2 Should NOT Do

Layer 2 overrides should **not** call `.required()` or `.optional()` — Layer 1 handles that. If an override calls `.required()`, it conflicts with Layer 1's conditional logic.

The rule: Layer 1 defines *whether a value must exist*. Layer 2 defines *what kind of value* is valid.

## Type-Aware Generation

When OpenAPI schemas are configured, the generator uses the correct yup type for each field:

| OpenAPI type | Generated yup factory |
|---|---|
| `string` | `yup.string()` |
| `number` | `yup.number()` |
| `integer` | `yup.number().integer()` |
| `boolean` | `yup.boolean()` |
| `$ref` to enum | `yup.string().oneOf(Object.values(EnumName))` |
| unknown | `yup.mixed()` |

## Enum Support

When `enumImport` is configured, fields that reference an OpenAPI enum schema via `$ref` automatically generate `.oneOf(Object.values(EnumName))`:

```javascript
yupGenerator({
  output: "src/generated/ofs",
  enumImport: "@/api/generated/backend/index.schemas",
})
```

Generated output for a field with `$ref: "#/components/schemas/OrderStatus"`:

```typescript
import { OrderStatus } from "@/api/generated/backend/index.schemas";

export const orderDefaults = () => ({
  status: yup.string().oneOf(Object.values(OrderStatus)),
  // ...
});
```

The `Fields` type automatically captures the narrowed enum type via `ReturnType<typeof orderDefaults>` — so `OrderFields["status"]` is `StringSchema<"PENDING" | "CONFIRMED" | ... | undefined>`, not just `StringSchema<string>`.

Only enums actually referenced by fields in the spec are imported.

## Custom Type Factories

Override the yup schema factory for specific OpenAPI types. Keys can be a base type (`"string"`) or a type:format combination (`"string:date"`). Format-specific overrides take priority.

```javascript
yupGenerator({
  output: "src/generated/ofs",
  enumImport: "@/api/generated/backend/index.schemas",
  types: {
    string: {
      factory: "string()",
      import: { name: "string", from: "@/utils/validation/types" },
    },
    "string:date": {
      factory: "dateString()",
      import: { name: "dateString", from: "@/utils/validation/date-string" },
    },
  },
})
```

This generates:

```typescript
import { string } from "@/utils/validation/types";
import { dateString } from "@/utils/validation/date-string";
import { AccountType } from "@/api/generated/backend/index.schemas";

export const registrationDefaults = () => ({
  accountType: string().oneOf(Object.values(AccountType)),  // custom factory + enum
  username: string(),                                        // custom factory
  birthDate: dateString(),                                   // format-specific factory
  // ...
});
```

The `TypeOverride` interface:

| Property | Type | Description |
|----------|------|-------------|
| `factory` | `string` | Expression for the schema factory (e.g. `"string()"`, `"dateString()"`) |
| `import` | `{ name, from }` | Import to add to the generated file. Omit if using yup directly. |

Type resolution priority: `type:format` > `type` > built-in default > `yup.mixed()`.

## Using with react-hook-form

The schema function returns a complete `yup.ObjectSchema`:

```typescript
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { registrationSchema } from "./generated/ofs/registration.ofs";

const schema = registrationSchema({
  email: yup.string().email(),
});

function RegistrationForm() {
  const { register, handleSubmit } = useForm({
    resolver: yupResolver(schema),
  });

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

## Passing Context

If your spec uses `context:` conditions, pass context when validating.

**With react-hook-form:**

```typescript
useForm({
  resolver: yupResolver(schema),
  context: {
    config: { requirePhone: true, region: "DE" },
  },
});
```

**With plain yup:**

```typescript
schema.validate(data, {
  context: { config: { requirePhone: true } },
});
```

**Cross-section references** use `context.crossSections`:

```typescript
schema.validate(data, {
  context: {
    crossSections: {
      preferences: { separateBilling: true },
    },
  },
});
```

## Nested Fields

Nested objects in the spec generate nested `yup.object().shape()` calls. Sub-fields use their factory directly (not through the spread). Nested sub-fields are not currently overridable through the `overrides` parameter.

## Field State Behavior

| Base state | Generated yup | Effect |
|------------|---------------|--------|
| `required` | `fields.name.required()` | Typed schema + required |
| `optional` | `fields.name.optional()` | Typed schema, no required |
| `forbidden` | `yup.mixed().optional().strip()` | Value stripped, no validation |

For conditional fields, `when()` switches between states:

```typescript
// forbidden → required when condition matches
cardNumber: fields.cardNumber.when("paymentMethod", {
  is: (val) => val === "CREDIT_CARD",
  then: (s) => s.required(),                      // override applied + required
  otherwise: () => yup.mixed().optional().strip(), // stripped
}),
```

When a field is `forbidden` in the `otherwise` clause, `yup.mixed().strip()` is returned — discarding both the override and the default schema. Content validation doesn't run on fields that shouldn't exist.
