import type {
  ConditionExpr,
  FieldDefinition,
  FieldState,
  OFSDocument,
  WhenEntry,
} from "@open-form-spec/types";
import { isCompoundWhen } from "@open-form-spec/types";

export interface ResolveInput {
  values: Record<string, unknown>;
  context?: Record<string, unknown>;
  crossSections?: Record<string, Record<string, unknown>>;
}

export type ResolvedFieldStates = Record<string, FieldState>;

export function resolveFieldStates(
  doc: OFSDocument,
  input: ResolveInput,
): ResolvedFieldStates {
  const result: ResolvedFieldStates = {};
  resolveFields(doc.fields, "", input, result);
  return result;
}

function resolveFields(
  fields: Record<string, FieldDefinition>,
  prefix: string,
  input: ResolveInput,
  result: ResolvedFieldStates,
): void {
  for (const [name, field] of Object.entries(fields)) {
    const fullPath = prefix ? `${prefix}.${name}` : name;
    result[fullPath] = resolveField(field, input);

    if (field.fields) {
      resolveFields(field.fields, fullPath, input, result);
    }
  }
}

function resolveField(field: FieldDefinition, input: ResolveInput): FieldState {
  if (!field.when) return field.state;

  for (const entry of field.when) {
    if (matchesWhen(entry, input)) {
      return entry.then;
    }
  }

  return field.state;
}

function matchesWhen(entry: WhenEntry, input: ResolveInput): boolean {
  if (isCompoundWhen(entry)) {
    return entry.all.every((cond) => matchesCondition(cond, input));
  }
  return matchesCondition(entry, input);
}

function matchesCondition(
  cond: ConditionExpr,
  input: ResolveInput,
): boolean {
  const value = getConditionValue(cond, input);
  return evaluateComparator(cond, value);
}

function getConditionValue(
  cond: ConditionExpr,
  input: ResolveInput,
): unknown {
  if (cond.context) {
    return getNestedValue(input.context ?? {}, cond.context);
  }

  if (cond.section && cond.field) {
    const sectionValues = input.crossSections?.[cond.section] ?? {};
    return getNestedValue(sectionValues, cond.field);
  }

  if (cond.field) {
    return getNestedValue(input.values, cond.field);
  }

  return undefined;
}

function evaluateComparator(cond: ConditionExpr, value: unknown): boolean {
  if (cond.is !== undefined) return matchValue(value, cond.is);
  if (cond.isNot !== undefined) return !matchValue(value, cond.isNot);
  if (cond.in !== undefined)
    return cond.in.some((item) => matchValue(value, item));
  if (cond.notIn !== undefined)
    return !cond.notIn.some((item) => matchValue(value, item));
  return false;
}

/**
 * Compares a runtime value against a spec value.
 * Enum references like "AccountType.BUSINESS" are resolved to "BUSINESS"
 * for comparison against the actual runtime value.
 */
function matchValue(actual: unknown, spec: unknown): boolean {
  return actual === resolveSpecValue(spec);
}

function resolveSpecValue(spec: unknown): unknown {
  if (typeof spec !== "string" || !spec.includes(".")) return spec;
  const dotIndex = spec.indexOf(".");
  const prefix = spec.substring(0, dotIndex);
  if (prefix[0] === prefix[0].toUpperCase() && prefix[0] !== prefix[0].toLowerCase()) {
    return spec.substring(dotIndex + 1);
  }
  return spec;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
