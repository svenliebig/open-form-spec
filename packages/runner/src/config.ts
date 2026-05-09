import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import type { OFSConfig } from "@ofs/plugin";

const CONFIG_FILES = ["ofs.config.js", "ofs.config.mjs"];

export interface ResolvedConfig {
  config: OFSConfig;
  rootDir: string;
}

export async function loadConfig(
  configPath?: string,
): Promise<ResolvedConfig> {
  const cwd = process.cwd();

  if (configPath) {
    const absolute = resolve(cwd, configPath);
    if (!existsSync(absolute)) {
      throw new Error(`Config file not found: ${absolute}`);
    }
    return importConfig(absolute);
  }

  for (const name of CONFIG_FILES) {
    const candidate = resolve(cwd, name);
    if (existsSync(candidate)) {
      return importConfig(candidate);
    }
  }

  throw new Error(
    `No config file found. Create one of: ${CONFIG_FILES.join(", ")}`,
  );
}

async function importConfig(absolutePath: string): Promise<ResolvedConfig> {
  const fileUrl = pathToFileURL(absolutePath).href;
  const module = await import(fileUrl);
  const config = module.default as OFSConfig;

  if (!config || !config.specs) {
    throw new Error(
      `Invalid config in ${absolutePath}. Must export default defineConfig({ specs, ... })`,
    );
  }

  return {
    config,
    rootDir: dirname(absolutePath),
  };
}
