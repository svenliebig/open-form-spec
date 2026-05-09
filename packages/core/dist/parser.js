import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
export function parseOFS(filePath) {
    const content = readFileSync(filePath, "utf-8");
    return parseYaml(content);
}
