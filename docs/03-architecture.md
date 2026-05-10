# Architecture

## Package Overview

```
open-form-spec/
├── schema.json                    # JSON Schema for .ofs.yaml intellisense
├── examples/                      # Abstract fixtures for testing
├── docs/                          # This documentation
└── packages/
    ├── types/                     # @open-form-spec/types
    ├── core/                      # @open-form-spec/core
    ├── validator/                 # @open-form-spec/validator
    ├── plugin/                    # @open-form-spec/plugin
    ├── runner/                    # @open-form-spec/runner
    └── plugin-yup/                # @open-form-spec/plugin-yup
```

## Packages

### @open-form-spec/types

Zero-dependency type definitions for the OFS document model and OpenAPI types.

Everything else depends on this package. It defines the shape of parsed `.ofs.yaml` documents (`OFSDocument`, `FieldDefinition`, `WhenEntry`, etc.) and OpenAPI property info (`OpenAPIPropertyInfo`, `OpenAPISchemas`).

### @open-form-spec/core

Parser and resolver. The runtime heart of OFS.

- `parseOFS(filePath)` — reads a `.ofs.yaml` file and returns a typed `OFSDocument`
- `resolveFieldStates(doc, input)` — evaluates all field states given form values and context, returns a flat map of `fieldName → "required" | "optional" | "forbidden"`

The resolver is the reference implementation of OFS condition evaluation. Plugins and generators should produce behavior consistent with it.

### @open-form-spec/validator

Build-time validation of OFS documents.

- `validate(doc, options)` — checks an OFS document against the JSON Schema, verifies enum imports exist in the OpenAPI spec, validates individual enum values, and checks condition structure
- `extractEnumsFromOpenAPI(filePath)` — extracts enum definitions from an OpenAPI spec
- `extractSchemasFromOpenAPI(filePath)` — extracts DTO property types from an OpenAPI spec

### @open-form-spec/plugin

Plugin API types and configuration helper. This is what plugin authors and config files import.

- `OFSPlugin` — the interface every plugin implements
- `OFSPluginContext` — what plugins receive (specs, enums, schemas, rootDir)
- `OFSPluginResult` — what plugins return (files, errors, warnings)
- `OFSPluginFactory<T>` — type for plugin factory functions
- `defineConfig(config)` — identity function for config file type inference

### @open-form-spec/runner

CLI that loads the config, parses specs, validates, and runs plugins.

```bash
npx ofs generate                   # validate + run all plugins
npx ofs validate                   # validate only
npx ofs generate --plugin yup      # run a specific plugin
npx ofs generate --config my.js    # custom config path
```

The runner handles infrastructure (file discovery, OpenAPI loading, file writing). Plugins handle generation.

### @open-form-spec/plugin-yup

First-party plugin. Generates yup validation schemas from OFS specs.

Produces per section:
- `{section}Defaults` — exported const with typed defaults (including enum `.oneOf()` narrowing)
- `{Section}Fields` — type derived from `typeof defaults`, preserves all narrowed types
- `{section}Schema(overrides?)` — generic function that spreads defaults with user overrides, applies Layer 1 states, returns `yup.ObjectSchema`

Features: OpenAPI type-aware generation, format-specific type overrides (`string:date` → `dateString()`), automatic enum `.oneOf()` from `$ref`, full TypeScript type preservation through object spread.

## Dependency Graph

```
@open-form-spec/types          (no deps)
    ▲
    │
    ├── @open-form-spec/core           (types, yaml)
    ├── @open-form-spec/plugin         (types)
    ├── @open-form-spec/validator      (types, ajv, yaml)
    │
    ▼
@open-form-spec/runner         (types, core, validator, plugin)
@open-form-spec/plugin-yup     (types, plugin)
```

## Build Order

Packages must be built in dependency order:

```
types → plugin → core → validator → runner → plugin-yup
```

The root `npm run build` handles this automatically.

## Data Flow

```
ofs.config.js
    │
    ▼
┌─────────┐    ┌──────────────┐    ┌───────────┐
│  Runner  │───►│  .ofs.yaml   │───►│  Parser   │──► OFSDocument[]
│          │    │  files       │    │  (@open-form-spec/core)│
│          │    └──────────────┘    └───────────┘
│          │
│          │    ┌──────────────┐    ┌───────────┐
│          │───►│  OpenAPI      │───►│ Validator │──► enums + schemas
│          │    │  specs       │    │           │     + errors
│          │    └──────────────┘    └───────────┘
│          │
│          │    ┌──────────────┐
│          │───►│  Plugins     │──► GeneratedFile[]
│          │    │              │     + errors
│          │    └──────────────┘     + warnings
│          │
│          │───► Write files to disk
└─────────┘
```

Plugins receive already-parsed, already-validated specs. They produce files and/or errors. They don't touch the filesystem directly — the runner writes their output.
