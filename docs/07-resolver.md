# Resolver

The resolver is the reference implementation for evaluating OFS field states. Given an OFS document, form values, and context, it returns the resolved state of every field.

## Usage

```typescript
import { parseOFS, resolveFieldStates } from "@ofs/core";

const spec = parseOFS("registration.ofs.yaml");

const states = resolveFieldStates(spec, {
  values: { accountType: "BUSINESS" },
  context: { config: { region: "DE" } },
});

// states.email === "required"
// states.companyName === "required"
// states.vatNumber === "required"
// states.nickname === "optional"
// states.taxId === "required"
```

## Input

```typescript
interface ResolveInput {
  /** Field values for this section. */
  values: Record<string, unknown>;

  /** External context data (matches the spec's context definitions). */
  context?: Record<string, unknown>;

  /** Field values from other sections, for cross-section conditions. */
  crossSections?: Record<string, Record<string, unknown>>;
}
```

## Output

A flat map from field path to resolved state:

```typescript
type ResolvedFieldStates = Record<string, FieldState>;
// { "email": "required", "address": "required", "address.street": "required", ... }
```

Nested fields are flattened with dot notation. Both the parent object and its sub-fields get their own entries.

## Evaluation Rules

1. For each field, `when` entries are checked in order
2. The first matching condition determines the state
3. If no condition matches, the base `state` applies
4. Enum references (e.g. `AccountType.BUSINESS`) are resolved to bare values (`"BUSINESS"`) before comparison

## Use Cases

The resolver is useful for:

- **Testing** — verify that your OFS spec produces expected states for given inputs
- **Runtime resolution** — evaluate field states dynamically in your application
- **Plugin development** — ensure generated code matches the resolver's behavior
- **Contract testing** — compare frontend and backend validation against the resolver as ground truth
