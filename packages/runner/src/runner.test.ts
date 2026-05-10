import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { run } from "./runner.js";
import type { OFSConfig } from "@open-form-spec/plugin";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "../../..");

describe("runner", () => {
  const baseConfig: OFSConfig = {
    specs: "examples/**/*.ofs.yaml",
    openapi: {
      api: "examples/registration.openapi.yaml",
    },
  };

  it("validates specs successfully", async () => {
    const result = await run({
      config: baseConfig,
      rootDir,
      command: "validate",
    });
    assert.equal(result.success, true);
    assert.equal(result.specCount, 1);
    assert.equal(result.validationErrors, 0);
  });

  it("runs generate with no plugins", async () => {
    const result = await run({
      config: baseConfig,
      rootDir,
      command: "generate",
    });
    assert.equal(result.success, true);
    assert.equal(result.pluginResults.length, 0);
  });

  it("runs a plugin and collects results", async () => {
    const config: OFSConfig = {
      ...baseConfig,
      plugins: [
        {
          name: "test-plugin",
          async run(context) {
            return {
              files: context.specs.map((spec) => ({
                path: `/tmp/ofs-test/${spec.section}.txt`,
                content: `section: ${spec.section}`,
              })),
            };
          },
        },
      ],
    };

    const result = await run({
      config,
      rootDir,
      command: "generate",
    });
    assert.equal(result.success, true);
    assert.equal(result.pluginResults.length, 1);
    assert.equal(result.pluginResults[0].pluginName, "test-plugin");
    assert.equal(result.pluginResults[0].filesWritten, 1);
  });

  it("reports plugin errors", async () => {
    const config: OFSConfig = {
      ...baseConfig,
      plugins: [
        {
          name: "failing-plugin",
          async run() {
            return {
              errors: [{ path: "/test", message: "something broke" }],
            };
          },
        },
      ],
    };

    const result = await run({
      config,
      rootDir,
      command: "generate",
    });
    assert.equal(result.success, false);
    assert.equal(result.pluginResults[0].errors, 1);
  });

  it("runs afterAllFilesWrite hook as string", async () => {
    const markerFile = resolve(rootDir, "tmp-hook-test-marker");
    const config: OFSConfig = {
      ...baseConfig,
      plugins: [
        {
          name: "noop",
          async run() { return { files: [] }; },
        },
      ],
      hooks: {
        afterAllFilesWrite: `touch ${markerFile}`,
      },
    };

    try {
      const result = await run({ config, rootDir, command: "generate" });
      assert.equal(result.success, true);
      assert.ok(existsSync(markerFile), "hook should have created marker file");
    } finally {
      if (existsSync(markerFile)) unlinkSync(markerFile);
    }
  });

  it("runs afterAllFilesWrite hooks as array", async () => {
    const marker1 = resolve(rootDir, "tmp-hook-test-marker-1");
    const marker2 = resolve(rootDir, "tmp-hook-test-marker-2");
    const config: OFSConfig = {
      ...baseConfig,
      plugins: [
        {
          name: "noop",
          async run() { return { files: [] }; },
        },
      ],
      hooks: {
        afterAllFilesWrite: [
          `touch ${marker1}`,
          `touch ${marker2}`,
        ],
      },
    };

    try {
      const result = await run({ config, rootDir, command: "generate" });
      assert.equal(result.success, true);
      assert.ok(existsSync(marker1), "first hook should have created marker");
      assert.ok(existsSync(marker2), "second hook should have created marker");
    } finally {
      if (existsSync(marker1)) unlinkSync(marker1);
      if (existsSync(marker2)) unlinkSync(marker2);
    }
  });

  it("does not run hooks when plugins have errors", async () => {
    const markerFile = resolve(rootDir, "tmp-hook-test-no-run");
    const config: OFSConfig = {
      ...baseConfig,
      plugins: [
        {
          name: "failing",
          async run() {
            return { errors: [{ path: "/test", message: "fail" }] };
          },
        },
      ],
      hooks: {
        afterAllFilesWrite: `touch ${markerFile}`,
      },
    };

    try {
      const result = await run({ config, rootDir, command: "generate" });
      assert.equal(result.success, false);
      assert.ok(!existsSync(markerFile), "hook should NOT run on errors");
    } finally {
      if (existsSync(markerFile)) unlinkSync(markerFile);
    }
  });

  it("filters plugins by name", async () => {
    const config: OFSConfig = {
      ...baseConfig,
      plugins: [
        {
          name: "plugin-a",
          async run() { return { files: [] }; },
        },
        {
          name: "plugin-b",
          async run() { return { files: [] }; },
        },
      ],
    };

    const result = await run({
      config,
      rootDir,
      command: "generate",
      pluginFilter: "plugin-b",
    });
    assert.equal(result.pluginResults.length, 1);
    assert.equal(result.pluginResults[0].pluginName, "plugin-b");
  });
});
