# Introduction

## What is Open Form Spec?

Open Form Spec (OFS) is a declarative specification for form field state rules. It defines whether fields are **required**, **optional**, or **forbidden** based on form values and external context.

OFS sits between your OpenAPI spec and your application code. Where OpenAPI defines *what* your API looks like, OFS defines *when* each field should exist.

```
OpenAPI Spec          Open Form Spec          Application Code
─────────────         ──────────────          ────────────────
field types    ──►    field states     ──►    validation (yup, Java)
enum values           when conditions         form rendering
DTO schemas           context rules           transformers
```

## The Problem

In applications with both a frontend and backend, field state rules are duplicated across multiple layers:

**Frontend:**
- Validation schema (yup, zod) — `.required()`, `.optional()`, `.when()`
- Form rendering — conditionally shows/hides fields
- API transformer — strips or keeps values before sending to the backend

**Backend:**
- Validator classes — re-implements the same required/optional/forbidden logic

These four places encode the same business rule. For example: *"companyName is required when accountType is BUSINESS."* When they drift apart, three things happen:

1. **Ghost data** — a field is hidden in the UI but its old value persists in the database
2. **Inconsistent validation** — frontend allows a submission the backend rejects, or vice versa
3. **Downstream corruption** — invalid field combinations propagate to external systems

The root cause is not that validation exists in multiple places — it's that there is no single source of truth for which fields should exist under which conditions.

## The Solution: Two Layers

OFS separates validation into two layers:

### Layer 1: Field State (declarative, from OFS)

Declares whether each field is `required`, `optional`, or `forbidden` given the current form values and context. This layer causes the most bugs and is simple enough to express in YAML.

```yaml
fields:
  companyName:
    state: forbidden
    when:
      - field: accountType
        is: AccountType.BUSINESS
        then: required
```

### Layer 2: Field Content (hand-written, platform-native)

Value-level validation like date ranges, string length, email format, and cross-field comparisons. These stay in yup, zod, Java validators, or whatever your platform uses.

```typescript
// Layer 2: only override what you need — defaults handle the rest
import { registrationSchema } from "./generated/ofs/registration.ofs";

const schema = registrationSchema({
  email: yup.string().email(),
  password: yup.string().min(8),
});
```

The key insight: Layer 2 can safely assume Layer 1 has passed. If a field is `required`, Layer 2 knows the value is present. If a field is `forbidden`, Layer 2 never runs — the value is stripped.

## How It Works

1. You write `.ofs.yaml` files that define field states and conditions
2. The OFS tooling validates your specs against your OpenAPI definitions
3. Plugins generate platform-specific code (yup schemas, Java test fixtures, etc.)
4. Your application uses the generated Layer 1 code, combined with hand-written Layer 2 validation

```
.ofs.yaml ──► ofs validate ──► ofs generate ──► generated code
                   │                                  │
                   ▼                                  ▼
             OpenAPI spec              your Layer 2 validation code
           (enum + type check)            (combined at build time)
```
