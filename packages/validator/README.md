# @ofs/validator

Validates `.ofs.yaml` files against the OFS JSON schema and checks field/enum references against OpenAPI specs. Used internally by `@ofs/runner` — you only need this package directly if you are building custom tooling.

## Install

```bash
npm install @ofs/validator
```

## API

### `validate(options)`

Validates a set of parsed OFS documents against the schema and optional OpenAPI data.

```typescript
import { validate } from "@ofs/validator";

const errors = await validate({
  specs: [doc],
  openApiEnums: { api: { AccountType: ["PERSONAL", "BUSINESS"] } },
  openApiSchemas: { api: { Registration: { email: { type: "string" } } } },
});

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`${err.file}: ${err.message}`);
  }
}
```

### `extractEnumsFromOpenAPI(openapi)`

Extracts all enum values from a parsed OpenAPI document.

```typescript
import { extractEnumsFromOpenAPI } from "@ofs/validator";

const enums = extractEnumsFromOpenAPI(openapiDoc);
// { AccountType: ["PERSONAL", "BUSINESS"] }
```

### `extractSchemasFromOpenAPI(openapi)`

Extracts property type/format information from all schemas in a parsed OpenAPI document.

```typescript
import { extractSchemasFromOpenAPI } from "@ofs/validator";

const schemas = extractSchemasFromOpenAPI(openapiDoc);
// { Registration: { email: { type: "string", format: "email" } } }
```

## `ValidationError`

| Field | Type | Description |
|-------|------|-------------|
| `file` | `string` | Source file path |
| `message` | `string` | Error description |
