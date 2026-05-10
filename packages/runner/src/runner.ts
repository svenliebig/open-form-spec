import { parseOFS } from "@open-form-spec/core";
import type { OFSConfig, OFSPlugin, OFSPluginContext } from "@open-form-spec/plugin";
import type { OFSDocument, OpenAPISchemas } from "@open-form-spec/types";
import { extractEnumsFromOpenAPI, extractSchemasFromOpenAPI, validate } from "@open-form-spec/validator";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findSpecFiles } from "./files.js";

export interface RunOptions {
  config: OFSConfig;
  rootDir: string;
  command: "generate" | "validate";
  pluginFilter?: string;
}

export interface RunResult {
  specCount: number;
  validationErrors: number;
  pluginResults: PluginRunResult[];
  success: boolean;
}

export interface PluginRunResult {
  pluginName: string;
  filesWritten: number;
  errors: number;
  warnings: number;
}

export async function run(options: RunOptions): Promise<RunResult> {
  const { config, rootDir, command, pluginFilter } = options;

  // 1. Find and parse specs
  const specFiles = findSpecFiles(config.specs, rootDir);
  if (specFiles.length === 0) {
    log(`No .ofs.yaml files found matching: ${config.specs}`);
    return { specCount: 0, validationErrors: 0, pluginResults: [], success: true };
  }
  log(`Found ${specFiles.length} spec file(s)`);

  const specs: OFSDocument[] = specFiles.map((file) => {
    log(`  ${relative(rootDir, file)}`);
    return parseOFS(file);
  });

  // 2. Load OpenAPI enums and schemas
  const openApiEnums: Record<string, Record<string, string[]>> = {};
  const openApiSchemas: Record<string, OpenAPISchemas> = {};
  if (config.openapi) {
    for (const [source, specPaths] of Object.entries(config.openapi)) {
      const paths = Array.isArray(specPaths) ? specPaths : [specPaths];
      openApiEnums[source] = {};
      openApiSchemas[source] = {};
      for (const specPath of paths) {
        const absolutePath = resolve(rootDir, specPath);
        Object.assign(openApiEnums[source], extractEnumsFromOpenAPI(absolutePath));
        Object.assign(openApiSchemas[source], extractSchemasFromOpenAPI(absolutePath));
      }
      const enumCount = Object.keys(openApiEnums[source]).length;
      const schemaCount = Object.keys(openApiSchemas[source]).length;
      log(`  OpenAPI "${source}": ${enumCount} enum(s), ${schemaCount} schema(s)`);
    }
  }

  // 3. Run built-in validation
  const schemaPath = getSchemaPath();
  let totalValidationErrors = 0;

  for (let i = 0; i < specs.length; i++) {
    const errors = validate(specs[i], { schemaPath, openApiEnums });
    if (errors.length > 0) {
      totalValidationErrors += errors.length;
      const fileName = relative(rootDir, specFiles[i]);
      for (const err of errors) {
        logError(`  ${fileName}: ${err.path} — ${err.message}`);
      }
    }
  }

  if (totalValidationErrors > 0) {
    logError(`Validation failed with ${totalValidationErrors} error(s)`);
    return {
      specCount: specs.length,
      validationErrors: totalValidationErrors,
      pluginResults: [],
      success: false,
    };
  }
  log("Validation passed");

  // 4. If validate-only, stop here
  if (command === "validate") {
    return {
      specCount: specs.length,
      validationErrors: 0,
      pluginResults: [],
      success: true,
    };
  }

  // 5. Run plugins
  const plugins = filterPlugins(config.plugins ?? [], pluginFilter);
  const context: OFSPluginContext = { specs, openApiEnums, openApiSchemas, rootDir };
  const pluginResults: PluginRunResult[] = [];
  let hasErrors = false;

  for (const plugin of plugins) {
    log(`Running ${plugin.name}...`);
    const result = await plugin.run(context);

    const pluginResult: PluginRunResult = {
      pluginName: plugin.name,
      filesWritten: 0,
      errors: result.errors?.length ?? 0,
      warnings: result.warnings?.length ?? 0,
    };

    if (result.warnings) {
      for (const warning of result.warnings) {
        logWarn(`  ${plugin.name}: ${warning}`);
      }
    }

    if (result.errors && result.errors.length > 0) {
      hasErrors = true;
      for (const err of result.errors) {
        logError(`  ${plugin.name}: ${err.path} — ${err.message}`);
      }
    }

    if (result.files) {
      for (const file of result.files) {
        const filePath = resolve(rootDir, file.path);
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, file.content, "utf-8");
        pluginResult.filesWritten++;
        log(`  wrote ${relative(rootDir, filePath)}`);
      }
    }

    pluginResults.push(pluginResult);
  }

  // 6. Run hooks
  if (!hasErrors && config.hooks?.afterAllFilesWrite) {
    const commands = Array.isArray(config.hooks.afterAllFilesWrite)
      ? config.hooks.afterAllFilesWrite
      : [config.hooks.afterAllFilesWrite];

    for (const cmd of commands) {
      log(`Running hook: ${cmd}`);
      execSync(cmd, { cwd: rootDir, stdio: "inherit" });
    }
  }

  return {
    specCount: specs.length,
    validationErrors: 0,
    pluginResults,
    success: !hasErrors,
  };
}

function filterPlugins(plugins: OFSPlugin[], filter?: string): OFSPlugin[] {
  if (!filter) return plugins;
  const filtered = plugins.filter((p) => p.name === filter);
  if (filtered.length === 0) {
    const available = plugins.map((p) => p.name).join(", ");
    throw new Error(
      `Plugin "${filter}" not found. Available: ${available || "(none)"}`,
    );
  }
  return filtered;
}

function getSchemaPath(): string {
  // dist/runner.js → ../schema.json (runner package root)
  const thisDir = dirname(fileURLToPath(import.meta.url));
  return resolve(thisDir, "../schema.json");
}

function log(message: string): void {
  console.log(`ofs: ${message}`);
}

function logWarn(message: string): void {
  console.warn(`ofs [warn]: ${message}`);
}

function logError(message: string): void {
  console.error(`ofs [error]: ${message}`);
}
