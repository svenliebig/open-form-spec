import Ajv, { type ErrorObject } from "ajv";
import { readFileSync } from "node:fs";
import type {
  ConditionExpr,
  FieldDefinition,
  OFSDocument,
  WhenEntry,
} from "@ofs/types";
import { isCompoundWhen } from "@ofs/types";
import type { OpenAPIEnums } from "./openapi.js";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidateOptions {
  schemaPath: string;
  openApiEnums?: Record<string, OpenAPIEnums>;
}

export function validate(
  doc: OFSDocument,
  options: ValidateOptions,
): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateSchema(doc, options.schemaPath));
  if (errors.length > 0) return errors;

  errors.push(...validateEnumImports(doc, options.openApiEnums));
  errors.push(...validateEnumReferences(doc, options.openApiEnums));
  errors.push(...validateConditionSources(doc));

  return errors;
}

function validateSchema(
  doc: OFSDocument,
  schemaPath: string,
): ValidationError[] {
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  const ajv = new (Ajv as unknown as typeof Ajv.default)({ allErrors: true });
  const valid = ajv.validate(schema, doc);

  if (valid) return [];

  return (ajv.errors as ErrorObject[] ?? []).map((err) => ({
    path: err.instancePath || "/",
    message: `${err.message}${err.params ? ` (${JSON.stringify(err.params)})` : ""}`,
  }));
}

function validateEnumImports(
  doc: OFSDocument,
  openApiEnums?: Record<string, OpenAPIEnums>,
): ValidationError[] {
  if (!openApiEnums || !doc.imports?.enums) return [];

  const errors: ValidationError[] = [];

  for (const [alias, ref] of Object.entries(doc.imports.enums)) {
    const [source, schemaName] = ref.split("#");
    const sourceEnums = openApiEnums[source];

    if (!sourceEnums) {
      errors.push({
        path: `/imports/enums/${alias}`,
        message: `Unknown source '${source}'. Available: ${Object.keys(openApiEnums).join(", ")}`,
      });
      continue;
    }

    if (!sourceEnums[schemaName]) {
      errors.push({
        path: `/imports/enums/${alias}`,
        message: `Enum '${schemaName}' not found in source '${source}'. Available: ${Object.keys(sourceEnums).join(", ")}`,
      });
    }
  }

  return errors;
}

function validateEnumReferences(
  doc: OFSDocument,
  openApiEnums?: Record<string, OpenAPIEnums>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const enumImports = doc.imports?.enums ?? {};
  const knownAliases = new Set(Object.keys(enumImports));

  function resolveEnumValues(alias: string): string[] | undefined {
    if (!openApiEnums) return undefined;
    const ref = enumImports[alias];
    if (!ref) return undefined;
    const [source, schemaName] = ref.split("#");
    return openApiEnums[source]?.[schemaName];
  }

  function checkValue(value: unknown, path: string): void {
    if (typeof value === "string" && value.includes(".")) {
      const [alias, ...rest] = value.split(".");
      const enumValue = rest.join(".");
      if (
        alias[0] === alias[0].toUpperCase() &&
        alias[0] !== alias[0].toLowerCase()
      ) {
        if (!knownAliases.has(alias)) {
          errors.push({
            path,
            message: `Enum alias '${alias}' is not imported. Add it to imports.enums.`,
          });
          return;
        }

        const allowedValues = resolveEnumValues(alias);
        if (allowedValues && !allowedValues.includes(enumValue)) {
          errors.push({
            path,
            message: `Enum value '${enumValue}' does not exist in '${alias}'. Valid values: ${allowedValues.join(", ")}`,
          });
        }
      }
    }
  }

  function checkCondition(cond: ConditionExpr, path: string): void {
    if (cond.is !== undefined) checkValue(cond.is, `${path}/is`);
    if (cond.isNot !== undefined) checkValue(cond.isNot, `${path}/isNot`);
    if (cond.in) cond.in.forEach((v, i) => checkValue(v, `${path}/in/${i}`));
    if (cond.notIn)
      cond.notIn.forEach((v, i) => checkValue(v, `${path}/notIn/${i}`));
  }

  function checkWhen(entry: WhenEntry, path: string): void {
    if (isCompoundWhen(entry)) {
      entry.all.forEach((cond, i) => checkCondition(cond, `${path}/all/${i}`));
    } else {
      checkCondition(entry, path);
    }
  }

  function checkFields(
    fields: Record<string, FieldDefinition>,
    basePath: string,
  ): void {
    for (const [name, field] of Object.entries(fields)) {
      const fieldPath = `${basePath}/${name}`;
      if (field.when) {
        field.when.forEach((w, i) => checkWhen(w, `${fieldPath}/when/${i}`));
      }
      if (field.fields) {
        checkFields(field.fields, fieldPath);
      }
    }
  }

  checkFields(doc.fields, "/fields");
  return errors;
}

function validateConditionSources(doc: OFSDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  function checkCondition(cond: ConditionExpr, path: string): void {
    const hasField = !!cond.field;
    const hasContext = !!cond.context;
    const hasSection = !!cond.section;

    if (!hasField && !hasContext) {
      errors.push({
        path,
        message:
          "Condition must specify at least one source: 'field' or 'context'.",
      });
    }

    if (hasSection && !hasField) {
      errors.push({
        path,
        message: "'section' requires 'field' to be specified.",
      });
    }

    const hasComparator =
      cond.is !== undefined ||
      cond.isNot !== undefined ||
      cond.in !== undefined ||
      cond.notIn !== undefined;

    if (!hasComparator) {
      errors.push({
        path,
        message:
          "Condition must specify a comparator: 'is', 'isNot', 'in', or 'notIn'.",
      });
    }
  }

  function checkWhen(entry: WhenEntry, path: string): void {
    if (isCompoundWhen(entry)) {
      entry.all.forEach((cond, i) => checkCondition(cond, `${path}/all/${i}`));
    } else {
      checkCondition(entry, path);
    }
  }

  function checkFields(
    fields: Record<string, FieldDefinition>,
    basePath: string,
  ): void {
    for (const [name, field] of Object.entries(fields)) {
      const fieldPath = `${basePath}/${name}`;
      if (field.when) {
        field.when.forEach((w, i) => checkWhen(w, `${fieldPath}/when/${i}`));
      }
      if (field.fields) {
        checkFields(field.fields, fieldPath);
      }
    }
  }

  checkFields(doc.fields, "/fields");
  return errors;
}
