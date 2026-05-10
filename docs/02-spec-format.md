# Spec Format

OFS files use YAML with the `.ofs.yaml` extension. IDE intellisense is provided via a JSON Schema.

Add the modeline comment as the first line of your file, using the tag that matches your installed version:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/svenliebig/open-form-spec/refs/tags/v0.1.0/schema.json
```

The schema is fetched once by the editor and cached locally. Replace `v0.1.0` with your installed version.

## Document Structure

```yaml
section: registration           # Section identifier
dto: Registration               # OpenAPI DTO schema name

imports:                         # Enum references
  enums:
    AccountType: "api#AccountType"

context:                         # External data definitions
  config:
    type: object
    properties:
      requirePhone:
        type: boolean

fields:                          # Field state rules
  email:
    state: required
```

### Required Properties

| Property | Description |
|----------|-------------|
| `section` | Identifier for this form section. Used as the function name in generated code. |
| `dto` | Name of the OpenAPI schema this section maps to. Used for type and enum lookups. |
| `fields` | Map of field names to their state definitions. |

### Optional Properties

| Property | Description |
|----------|-------------|
| `imports` | Enum references to OpenAPI schemas. Validated at build time. |
| `context` | Typed definitions for external data used in conditions. |

## Fields

Each field has a base `state` and optional `when` conditions:

```yaml
fields:
  email:
    state: required              # always required

  phone:
    state: optional              # optional by default
    when:
      - context: config.requirePhone
        is: true
        then: required            # becomes required when context says so

  companyName:
    state: forbidden             # hidden by default
    when:
      - field: accountType
        is: AccountType.BUSINESS
        then: required            # shown and required for business accounts
```

### Field States

| State | Meaning | Frontend behavior | Backend behavior |
|-------|---------|-------------------|------------------|
| `required` | Must have a value | Field visible, validation enforced | Reject if missing |
| `optional` | May have a value | Field visible, no validation | Accept if present |
| `forbidden` | Must not have a value | Field hidden, value cleared | Reject if present |

### Nested Fields

Object-typed fields can define sub-fields:

```yaml
fields:
  address:
    state: optional
    when:
      - field: accountType
        is: AccountType.BUSINESS
        then: required
    fields:
      street:
        state: required
      city:
        state: required
      country:
        state: required
```

When the parent object is `forbidden`, all sub-fields are also forbidden.

## Conditions

### Simple Condition

A single source and comparator:

```yaml
when:
  - field: accountType
    is: AccountType.BUSINESS
    then: required
```

### Condition Sources

| Source | Syntax | Description |
|--------|--------|-------------|
| Same-section field | `field: fieldName` | Value of another field in this section |
| Context | `context: path.to.value` | External data passed at validation time |
| Cross-section field | `section: otherSection` + `field: fieldName` | Field in a different section |

### Comparators

| Comparator | Description | Example |
|------------|-------------|---------|
| `is` | Strictly equal | `is: AccountType.BUSINESS` |
| `isNot` | Not strictly equal | `isNot: AccountType.PERSONAL` |
| `in` | One of the listed values | `in: [Country.DE, Country.AT]` |
| `notIn` | None of the listed values | `notIn: [Status.CLOSED]` |

### Compound Conditions (AND)

Multiple conditions that must all match:

```yaml
when:
  - all:
      - context: config.region
        in: [Country.DE, Country.AT, Country.CH]
      - field: accountType
        is: AccountType.BUSINESS
    then: required
```

### Evaluation Order

`when` entries are evaluated top-to-bottom. **First match wins.** If no condition matches, the base `state` applies.

```yaml
myField:
  state: forbidden
  when:
    - context: config.mode
      is: "advanced"
      then: required          # checked first
    - field: showExtras
      is: true
      then: optional          # checked second
    # if neither matches → forbidden (base state)
```

## Enum Imports

Enum values in conditions reference their OpenAPI definition:

```yaml
imports:
  enums:
    AccountType: "api#AccountType"     # source#SchemaName
    Country: "api#Country"

fields:
  companyName:
    state: forbidden
    when:
      - field: accountType
        is: AccountType.BUSINESS       # validated against OpenAPI
        then: required
```

The format is `source#SchemaName` where `source` matches the key in your `ofs.config.js` openapi mapping.

The validator checks:
1. The enum schema exists in the OpenAPI spec (`AccountType`)
2. The enum value exists in that schema (`BUSINESS`)

Typos and renamed values are caught at build time.

## Context

Context defines external data available during validation that is not part of the form section:

```yaml
context:
  config:
    type: object
    properties:
      requirePhone:
        type: boolean
      region:
        enum: Country
```

Context values are passed at validation time — how you pass them depends on your platform (yup validation context, Java method parameters, etc.).
