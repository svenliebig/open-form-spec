import { parseOFS } from "@ofs/core";
import type {
  OFSDocument,
  OpenAPIPropertyInfo,
  OpenAPISchemas,
} from "@ofs/types";
import type { OpenAPIEnums } from "@ofs/validator";
import {
  extractEnumsFromOpenAPI,
  extractSchemasFromOpenAPI,
  validate,
} from "@ofs/validator";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TypeOverride } from "../src/generator.js";
import { generateYupCode } from "../src/generator.js";

const pluginRoot = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../..",
);
const fixturesDir = resolve(pluginRoot, "test/fixtures");
const schemaPath = resolve(pluginRoot, "../../schema.json");

export interface TestFixture {
  /** The parsed OFS document. */
  spec: OFSDocument;
  /** The generated yup code. */
  code: string;
  /** OpenAPI schemas keyed by source name. */
  schemas: Record<string, OpenAPISchemas>;
  /** Validates the OFS spec against the JSON Schema and OpenAPI enums. Returns errors. */
  validate(): { path: string; message: string }[];
  /** Looks up the OpenAPI property info for a field in this spec's DTO. */
  propertyInfo(
    source: string,
    fieldName: string,
  ): OpenAPIPropertyInfo | undefined;
}

export interface FixtureOptions {
  /** Name of the fixture (matches the file prefix in test/fixtures/, e.g. "checkout"). */
  name: string;

  /** Name of the test result file (default is <name>.testresult.ts).  */
  testResultName?: string;
  /**
   * OpenAPI source mapping. Keys match the import prefix in the OFS spec.
   * Values are filenames relative to test/fixtures/.
   * @example { api: "checkout.openapi.yaml" }
   */
  openapi?: Record<string, string>;
  /** Type overrides passed to the generator. */
  types?: Record<string, TypeOverride>;
  /** Import path for enum types. When set, enum fields generate .oneOf(Object.values(EnumName)). */
  enumImport?: string;
}

/**
 * Loads an OFS fixture, generates yup code, writes the .testresult.ts file,
 * and returns everything needed for assertions.
 *
 * @example
 * const { spec, code, validate, schemas, propertyInfo } = loadFixture({
 *   name: "checkout",
 *   openapi: { api: "checkout.openapi.yaml" },
 * });
 */
export function loadFixture(options: FixtureOptions): TestFixture {
  const ofsPath = resolve(fixturesDir, `${options.name}.ofs.yaml`);
  const spec = parseOFS(ofsPath);

  // Resolve OpenAPI enums and schemas
  const openApiEnums: Record<string, OpenAPIEnums> = {};
  const schemas: Record<string, OpenAPISchemas> = {};
  if (options.openapi) {
    for (const [source, filename] of Object.entries(options.openapi)) {
      const filePath = resolve(fixturesDir, filename);
      openApiEnums[source] = extractEnumsFromOpenAPI(filePath);
      schemas[source] = extractSchemasFromOpenAPI(filePath);
    }
  }

  // Resolve DTO properties across all sources
  let dtoProperties: Record<string, OpenAPIPropertyInfo> | undefined;
  for (const source of Object.values(schemas)) {
    if (source[spec.dto]) {
      dtoProperties = source[spec.dto];
      break;
    }
  }

  // Merge all enums across sources
  const allEnums: Record<string, string[]> = {};
  for (const source of Object.values(openApiEnums)) {
    Object.assign(allEnums, source);
  }

  const code = generateYupCode(spec, {
    dtoProperties,
    types: options.types,
    enums: allEnums,
    enumImport: options.enumImport,
  });

  // Write test result file for inspection
  const resultPath = resolve(fixturesDir, `${options.testResultName ?? options.name}.testresult.ts`);
  writeFileSync(resultPath, code, "utf-8");

  return {
    spec,
    code,
    schemas,
    validate() {
      return validate(spec, { schemaPath, openApiEnums });
    },
    propertyInfo(source: string, fieldName: string) {
      return schemas[source]?.[spec.dto]?.[fieldName];
    },
  };
}
