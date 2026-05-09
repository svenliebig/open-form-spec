#!/usr/bin/env node

import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import { run } from "./runner.js";

const USAGE = `
Usage: ofs <command> [options]

Commands:
  generate    Validate specs and run all plugins
  validate    Validate specs only (no generation)

Options:
  -c, --config <path>   Path to config file (default: ofs.config.js)
  -p, --plugin <name>   Run only a specific plugin
  -h, --help            Show this help
`.trim();

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      config: { type: "string", short: "c" },
      plugin: { type: "string", short: "p" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }

  const command = positionals[0];
  if (command !== "generate" && command !== "validate") {
    console.error(`Unknown command: ${command}\n`);
    console.log(USAGE);
    process.exit(1);
  }

  const { config, rootDir } = await loadConfig(values.config);

  const result = await run({
    config,
    rootDir,
    command,
    pluginFilter: values.plugin,
  });

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`ofs [fatal]: ${err.message}`);
  process.exit(1);
});
