import { join } from "node:path";
import type { OFSPlugin } from "@open-form-spec/plugin";
import type { OFSDocument, OpenAPIPropertyInfo, OpenAPISchemas } from "@open-form-spec/types";
import { generateYupCode } from "./generator.js";

export type { GeneratorContext, TypeOverride } from "./generator.js";

import type { TypeOverride } from "./generator.js";

export interface YupGeneratorOptions {
  /** Output directory for generated files, relative to config root. */
  output: string;
  /**
   * Override the yup schema factory for specific OpenAPI types.
   * Keys are OpenAPI types ("string", "number") or type:format ("string:date").
   */
  types?: Record<string, TypeOverride>;
  /**
   * Import path for OpenAPI enum types. When set, fields referencing enums
   * generate `.oneOf(Object.values(EnumName))` and import the enum from this path.
   *
   * @example
   * enumImport: "@/api/generated/backend/index.schemas"
   */
  enumImport?: string;
  /**
   * Validation messages per type key and state. Keys follow the same resolution
   * as `types` ("string", "string:date", "string:enum"). Each state maps to a
   * TypeOverride with the message expression and optional import.
   *
   * @example
   * messages: {
   *   "string:enum": {
   *     required: {
   *       factory: "VALIDATION_MESSAGES.REQUIRED_OPTION",
   *       import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
   *     },
   *   },
   * }
   */
  messages?: Record<string, Record<string, TypeOverride>>;
}

export function yupGenerator(options: YupGeneratorOptions): OFSPlugin {
  return {
    name: "yup",
    async run(context) {
      const files = context.specs.map((spec) => ({
        path: join(options.output, `${spec.section}.ofs.ts`),
        content: generateYupCode(spec, {
          dtoProperties: resolveDtoProperties(spec, context.openApiSchemas),
          types: options.types,
          enums: resolveEnums(spec, context.openApiEnums),
          enumImport: options.enumImport,
          messages: options.messages,
        }),
      }));

      return { files };
    },
  };
}

function resolveDtoProperties(
  spec: OFSDocument,
  schemas: Record<string, OpenAPISchemas>,
): Record<string, OpenAPIPropertyInfo> | undefined {
  for (const source of Object.values(schemas)) {
    if (source[spec.dto]) return source[spec.dto];
  }
  return undefined;
}

function resolveEnums(
  spec: OFSDocument,
  openApiEnums: Record<string, Record<string, string[]>>,
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const source of Object.values(openApiEnums)) {
    Object.assign(merged, source);
  }
  return merged;
}
