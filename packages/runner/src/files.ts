import { readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Finds all .ofs.yaml files matching a glob-like pattern.
 * Supports patterns like "src/specs/**\/*.ofs.yaml" or just a directory path.
 */
export function findSpecFiles(pattern: string, rootDir: string): string[] {
  const basePart = pattern.split("**")[0].replace(/\/+$/, "") || ".";
  const baseDir = resolve(rootDir, basePart);

  if (!statSync(baseDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Spec directory not found: ${baseDir}`);
  }

  return findRecursive(baseDir, ".ofs.yaml");
}

function findRecursive(dir: string, extension: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRecursive(fullPath, extension));
    } else if (entry.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }

  return results.sort();
}
