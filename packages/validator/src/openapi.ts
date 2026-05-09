import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { OpenAPIPropertyInfo, OpenAPISchemas } from "@ofs/types";

export interface OpenAPIEnums {
  [schemaName: string]: string[];
}

interface OpenAPIDocument {
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}

interface OpenAPISchema {
  type?: string;
  format?: string;
  enum?: string[];
  $ref?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
}

export function extractEnumsFromOpenAPI(filePath: string): OpenAPIEnums {
  const content = readFileSync(filePath, "utf-8");
  const doc = (
    filePath.endsWith(".json") ? JSON.parse(content) : parseYaml(content)
  ) as OpenAPIDocument;

  const enums: OpenAPIEnums = {};
  const schemas = doc.components?.schemas ?? {};

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.enum && Array.isArray(schema.enum)) {
      enums[name] = schema.enum;
    }
  }

  return enums;
}

export function extractSchemasFromOpenAPI(filePath: string): OpenAPISchemas {
  const content = readFileSync(filePath, "utf-8");
  const doc = (
    filePath.endsWith(".json") ? JSON.parse(content) : parseYaml(content)
  ) as OpenAPIDocument;

  const result: OpenAPISchemas = {};
  const schemas = doc.components?.schemas ?? {};

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.properties) {
      result[name] = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        result[name][propName] = toPropertyInfo(propSchema);
      }
    }
  }

  return result;
}

function toPropertyInfo(schema: OpenAPISchema): OpenAPIPropertyInfo {
  const info: OpenAPIPropertyInfo = {};

  if (schema.$ref) {
    // Strip file path and schema path prefix: "common.yml#/components/schemas/AccountType" → "AccountType"
    info.ref = schema.$ref.replace(/^.*#\/components\/schemas\//, "").replace(/^#\/components\/schemas\//, "");
  }

  if (schema.type) info.type = schema.type;
  if (schema.format) info.format = schema.format;

  if (schema.items) {
    info.items = toPropertyInfo(schema.items);
  }

  return info;
}
