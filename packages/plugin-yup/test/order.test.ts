import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadFixture } from "./test-utils.js";

// --- Without enumImport ---

const { code: noEnumCode } = loadFixture({
  name: "order",
  testResultName: "order.no-enum",
  openapi: { api: "order.openapi.yaml" },
});

describe("order without enumImport", () => {
  it("does not generate oneOf for enum fields", () => {
    assert.ok(!noEnumCode.includes("Object.values("));
  });

  it("uses yup.string() for enum ref fields", () => {
    assert.ok(noEnumCode.includes("status: yup.string(),"));
    assert.ok(noEnumCode.includes("priority: yup.string(),"));
  });
});

// --- With enumImport ---

const { code } = loadFixture({
  name: "order",
  testResultName: "order.with-enum",
  openapi: { api: "order.openapi.yaml" },
  enumImport: "@/api/generated/backend/index.schemas",
});

describe("order with enumImport", () => {
  it("imports enum types from configured path", () => {
    assert.ok(
      code.includes(
        'import { OrderStatus, Priority } from "@/api/generated/backend/index.schemas"',
      ),
    );
  });

  it("generates oneOf for status field in defaults", () => {
    assert.ok(code.includes("status: yup.string().oneOf(Object.values(OrderStatus)),"));
  });

  it("generates oneOf for priority field in defaults", () => {
    assert.ok(code.includes("priority: yup.string().oneOf(Object.values(Priority)),"));
  });

  it("does not generate oneOf for plain string fields", () => {
    assert.ok(code.includes("customerName: yup.string(),"));
    assert.ok(code.includes("notes: yup.string(),"));
  });

  it("derives Fields type from defaults (includes oneOf narrowing)", () => {
    assert.ok(code.includes("export type OrderFields = typeof orderDefaults;"));
  });
});
