# Open Form Spec (OFS)

A declarative specification for form field state rules. Defines whether fields are **required**, **optional**, or **forbidden** based on form values and external context.

```yaml
section: registration
dto: Registration

imports:
  enums:
    AccountType: "api#AccountType"

fields:
  email:
    state: required
  nickname:
    state: optional
  companyName:
    state: forbidden
    when:
      - field: accountType
        is: AccountType.BUSINESS
        then: required
```

## Why

OpenAPI solved a real problem: API contracts were duplicated across teams, drifted apart, and caused subtle bugs. OFS solves the same problem one layer deeper.

In any application with a frontend and backend, field state rules — *"companyName is required when accountType is BUSINESS"* — get written four times: the validation schema, the form rendering logic, the API transformer, and the backend validator. When they drift, fields get silently accepted or rejected in the wrong places, old values persist in the database for hidden fields, and invalid data propagates downstream.

OFS is the single source of truth for field states. Declare the rules once in YAML, validated against your OpenAPI spec, and generate consistent code for every layer.

OFS sits between your OpenAPI spec and your application code. Where OpenAPI defines *what* your API looks like, OFS defines *when* each field should exist — in one place, consumed by both frontend and backend.

## Documentation

| Document | Description |
|----------|-------------|
| [Introduction](docs/01-introduction.md) | The problem, the two-layer solution, how it works |
| [Spec Format](docs/02-spec-format.md) | YAML format reference: fields, states, conditions, enums, context |
| [Architecture](docs/03-architecture.md) | Package overview, dependency graph, data flow |
| [Configuration](docs/04-configuration.md) | `ofs.config.js` reference and CLI commands |
| [Plugins](docs/05-plugins.md) | Plugin API, writing custom plugins |
| [Plugin: Yup](docs/06-plugin-yup.md) | Yup generator: Layer 1 + Layer 2, react-hook-form integration |
| [Resolver](docs/07-resolver.md) | Runtime field state evaluation |
| [Publishing](docs/09-publishing.md) | Changeset workflow: adding changesets, version PRs, npm publishing |

## Usage

```typescript
import { registrationSchema } from "./generated/ofs/registration.ofs";

// Override only what you need — enum .oneOf(), types, and states are generated
const schema = registrationSchema({
  email: yup.string().email(),
  password: yup.string().min(8),
});
// TypeScript infers: ObjectSchema<{ email: string, accountType: "PERSONAL" | "BUSINESS" | ..., ... }>
```

## Quick Start

```bash
# Install the CLI
npm install --save-dev @open-form-spec/runner @open-form-spec/plugin

# Add the yup plugin if needed
npm install --save-dev @open-form-spec/plugin-yup
```

```bash
# Run in your project
npx ofs validate          # validate specs against OpenAPI
npx ofs generate          # validate + run all plugins
```

## Packages

| Package | Description |
|---------|-------------|
| `@open-form-spec/types` | Type definitions (zero deps) |
| `@open-form-spec/core` | YAML parser + field state resolver |
| `@open-form-spec/validator` | Schema + enum validation against OpenAPI |
| `@open-form-spec/plugin` | Plugin API types + `defineConfig` |
| `@open-form-spec/runner` | CLI, config loading, plugin orchestration |
| `@open-form-spec/plugin-yup` | Generates type-preserving yup schemas with enum support and format-aware factories |
