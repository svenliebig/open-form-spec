import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
export function extractEnumsFromOpenAPI(filePath) {
    const content = readFileSync(filePath, "utf-8");
    const doc = (filePath.endsWith(".json") ? JSON.parse(content) : parseYaml(content));
    const enums = {};
    const schemas = doc.components?.schemas ?? {};
    for (const [name, schema] of Object.entries(schemas)) {
        if (schema.enum && Array.isArray(schema.enum)) {
            enums[name] = schema.enum;
        }
    }
    return enums;
}
export function extractSchemasFromOpenAPI(filePath) {
    const content = readFileSync(filePath, "utf-8");
    const doc = (filePath.endsWith(".json") ? JSON.parse(content) : parseYaml(content));
    const result = {};
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
function toPropertyInfo(schema) {
    const info = {};
    if (schema.$ref) {
        // Strip file path and schema path prefix: "common.yml#/components/schemas/Geschlecht" → "Geschlecht"
        info.ref = schema.$ref.replace(/^.*#\/components\/schemas\//, "").replace(/^#\/components\/schemas\//, "");
    }
    if (schema.type)
        info.type = schema.type;
    if (schema.format)
        info.format = schema.format;
    if (schema.items) {
        info.items = toPropertyInfo(schema.items);
    }
    return info;
}
