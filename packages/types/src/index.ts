export type FieldState = "required" | "optional" | "forbidden";

export interface OFSDocument {
  section: string;
  dto: string;
  imports?: {
    enums?: Record<string, string>;
  };
  context?: Record<string, ContextObject>;
  fields: Record<string, FieldDefinition>;
}

export interface ContextObject {
  type: "object";
  properties?: Record<string, ContextProperty>;
}

export interface ContextProperty {
  type?: "string" | "boolean" | "number";
  enum?: string;
}

export interface FieldDefinition {
  state: FieldState;
  when?: WhenEntry[];
  fields?: Record<string, FieldDefinition>;
}

export type WhenEntry = SimpleWhen | CompoundWhen;

export interface SimpleWhen {
  field?: string;
  section?: string;
  context?: string;
  is?: unknown;
  isNot?: unknown;
  in?: unknown[];
  notIn?: unknown[];
  then: FieldState;
}

export interface CompoundWhen {
  all: ConditionExpr[];
  then: FieldState;
}

export interface ConditionExpr {
  field?: string;
  section?: string;
  context?: string;
  is?: unknown;
  isNot?: unknown;
  in?: unknown[];
  notIn?: unknown[];
}

export function isCompoundWhen(entry: WhenEntry): entry is CompoundWhen {
  return "all" in entry;
}

// --- OpenAPI types ---

/** Type information for a single property in an OpenAPI schema. */
export interface OpenAPIPropertyInfo {
  /** OpenAPI type: "string", "integer", "number", "boolean", "array", "object". */
  type?: string;
  /** OpenAPI format: "email", "date", "date-time", "int32", "int64", "uuid", etc. */
  format?: string;
  /** Resolved $ref schema name (e.g. "PaymentMethod"), without the path prefix. */
  ref?: string;
  /** For array types, the item type info. */
  items?: OpenAPIPropertyInfo;
}

/**
 * OpenAPI schema properties, keyed by schema name then property name.
 * Example: `{ "Login": { "email": { type: "string" }, "password": { type: "string" } } }`
 */
export type OpenAPISchemas = Record<string, Record<string, OpenAPIPropertyInfo>>;
