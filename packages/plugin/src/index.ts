import type { OFSDocument, OpenAPISchemas } from "@ofs/types";

// --- Plugin API ---

export interface OFSPlugin {
  /** Unique plugin name, used for logging and --plugin filtering. */
  name: string;
  /** Called with all parsed specs and resolved context. */
  run(context: OFSPluginContext): Promise<OFSPluginResult>;
}

export interface OFSPluginContext {
  /** All parsed OFS spec documents. */
  specs: OFSDocument[];
  /** OpenAPI enums keyed by source name (e.g. { api: { AccountType: ["PERSONAL", ...] } }). */
  openApiEnums: Record<string, Record<string, string[]>>;
  /** OpenAPI schema properties keyed by source name, then schema name, then property name. */
  openApiSchemas: Record<string, OpenAPISchemas>;
  /** Absolute path to the directory containing ofs.config.js. */
  rootDir: string;
}

export interface OFSPluginResult {
  /** Files to write to disk. Paths are relative to rootDir unless absolute. */
  files?: GeneratedFile[];
  /** Errors that should fail the build. */
  errors?: PluginError[];
  /** Warnings that get logged but don't fail. */
  warnings?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface PluginError {
  path: string;
  message: string;
}

/** Creates a typed plugin factory. */
export type OFSPluginFactory<T = void> = T extends void
  ? () => OFSPlugin
  : (options: T) => OFSPlugin;

// --- Config ---

export interface OFSHooks {
  /** Command(s) to run after all plugin files have been written. Accepts a single command or an array of commands, executed sequentially. */
  afterAllFilesWrite?: string | string[];
}

export interface OFSConfig {
  /** Glob pattern for .ofs.yaml files (e.g. "src/specs/**\/*.ofs.yaml"). */
  specs: string;
  /** OpenAPI spec paths keyed by source name. Keys match import prefixes (e.g. "api" for "api#AccountType"). Accepts a single path or an array of paths that are merged. */
  openapi?: Record<string, string | string[]>;
  /** Plugins to run, in order. */
  plugins?: OFSPlugin[];
  /** Lifecycle hooks for running commands at specific points during generation. */
  hooks?: OFSHooks;
}

/** Identity function that provides type inference for ofs.config.js files. */
export function defineConfig(config: OFSConfig): OFSConfig {
  return config;
}
