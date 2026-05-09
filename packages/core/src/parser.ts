import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { OFSDocument } from "@ofs/types";

export function parseOFS(filePath: string): OFSDocument {
  const content = readFileSync(filePath, "utf-8");
  return parseYaml(content) as OFSDocument;
}
