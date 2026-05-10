# @open-form-spec/plugin-yup

Generates type-preserving [yup](https://github.com/jquense/yup) validation schemas from Open Form Spec files.

The generated code handles **Layer 1** — field states (`required` / `optional` / `forbidden`), conditional logic (`.when()`), and enum constraints (`.oneOf()`). You only override fields where you need additional content validation.

## Setup

```javascript
// ofs.config.js
import { defineConfig } from "@open-form-spec/plugin";
import { yupGenerator } from "@open-form-spec/plugin-yup";

export default defineConfig({
  specs: "src/specs/**/*.ofs.yaml",
  openapi: { api: "src/openapi.yaml" },
  plugins: [
    yupGenerator({
      output: "src/generated/ofs",
      enumImport: "@/api/generated/backend/index.schemas",
    }),
  ],
});
```

```bash
npx ofs generate
```

## What Gets Generated

For each spec section, the plugin generates a defaults object, a Fields type, and a schema function:

```typescript
// registration.ofs.ts (auto-generated)
import { AccountType } from "@/api/generated/backend/index.schemas";

export const registrationDefaults = {
  email: yup.string(),
  accountType: yup.string().oneOf(Object.values(AccountType)),
  nickname: yup.string(),
};
export type RegistrationFields = typeof registrationDefaults;

export function registrationSchema<T extends Partial<RegistrationFields>>(overrides?: T) {
  const fields = { ...registrationDefaults, ...overrides };

  return yup.object().shape({
    email: fields.email.required(),
    accountType: fields.accountType.required(),
    nickname: fields.nickname.optional(),
  });
}
```

Types are fully preserved — `RegistrationFields["accountType"]` is `StringSchema<"PERSONAL" | "BUSINESS" | ... | undefined>`, not just `StringSchema<string>`.

## Usage

Override only the fields where you need additional validation:

```typescript
import { registrationSchema } from "./generated/ofs/registration.ofs";

const schema = registrationSchema({
  email: yup.string().email("Invalid email"),
  password: yup.string().min(8),
});
```

Fields you don't override keep their generated defaults — correct type, enum `.oneOf()`, format-specific factory. Layer 2 overrides should **not** call `.required()` or `.optional()` — Layer 1 handles that.

## Plugin Options

| Option | Type | Description |
|--------|------|-------------|
| `output` | `string` | Output directory, relative to config root |
| `enumImport` | `string` | Import path for enum types. Enables `.oneOf(Object.values(EnumName))` generation |
| `types` | `Record<string, TypeOverride>` | Custom schema factories per OpenAPI type or type:format |

## Custom Type Factories

Override yup factories for specific OpenAPI types. Format-specific keys (`"string:date"`) take priority over base type keys (`"string"`):

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

See the [full plugin documentation](../../docs/06-plugin-yup.md) for react-hook-form integration, context passing, nested fields, and field state behavior details.
