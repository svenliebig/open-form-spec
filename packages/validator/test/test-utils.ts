import { parseOFS } from "@ofs/core";
import type { OFSDocument } from "@ofs/types";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { OpenAPIEnums } from "../src/openapi.js";
import {
  extractEnumsFromOpenAPI,
  extractSchemasFromOpenAPI,
} from "../src/openapi.js";
import { validate } from "../src/validator.js";

const validatorRoot = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../..",
);
const fixturesDir = resolve(validatorRoot, "test/fixtures");
const schemaPath = resolve(validatorRoot, "../../schema.json");

export interface TestFixture {
  /** The parsed OFS document. */
  spec: OFSDocument;
  /** Validates the OFS spec against the JSON Schema and OpenAPI enums. Returns errors. */
  validate(): { path: string; message: string }[];
}

export interface FixtureOptions {
  /** Name of the fixture (matches the file prefix in test/fixtures/, e.g. "registration"). */
  name: string;
  /**
   * OpenAPI source mapping. Keys match the import prefix in the OFS spec.
   * Values are filenames relative to test/fixtures/.
   * @example { api: "registration.openapi.yaml" }
   */
  openapi?: Record<string, string>;
}

/**
 * Loads an OFS fixture, resolves OpenAPI enums, and returns everything
 * needed for validation assertions.
 *
 * @example
 * const { spec, validate } = loadFixture({
 *   name: "registration",
 *   openapi: { api: "registration.openapi.yaml" },
 * });
 */
export function loadFixture(options: FixtureOptions): TestFixture {
  const ofsPath = resolve(fixturesDir, `${options.name}.ofs.yaml`);
  const spec = parseOFS(ofsPath);

  const openApiEnums: Record<string, OpenAPIEnums> = {};
  if (options.openapi) {
    for (const [source, filename] of Object.entries(options.openapi)) {
      const filePath = resolve(fixturesDir, filename);
      openApiEnums[source] = extractEnumsFromOpenAPI(filePath);
    }
  }

  return {
    spec,
    validate() {
      return validate(spec, { schemaPath, openApiEnums });
    },
  };
}
