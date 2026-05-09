import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadFixture } from "./test-utils.js";

const { code, validate } = loadFixture({
  name: "login",
  openapi: { api: "login.openapi.yaml" },
});

describe("login yup generation", () => {
  it("validates the OFS spec", () => {
    assert.deepEqual(validate(), []);
  });

  it("exports defaults object", () => {
    assert.ok(code.includes("export const loginDefaults = {"));
  });

  it("exports Fields type derived from defaults", () => {
    assert.ok(code.includes("export type LoginFields = typeof loginDefaults;"));
  });

  it("exports generic loginSchema function", () => {
    assert.ok(code.includes("export function loginSchema<T extends Partial<LoginFields>>(overrides?: T)"));
  });

  it("spreads defaults with overrides", () => {
    assert.ok(code.includes("const fields = { ...loginDefaults, ...overrides };"));
  });

  it("applies required state via fields reference", () => {
    assert.ok(code.includes("email: fields.email.required(),"));
    assert.ok(code.includes("password: fields.password.required(),"));
  });
});

// Test with custom type override
const customCode = loadFixture({
  name: "login",
  testResultName: "login.custom",
  openapi: { api: "login.openapi.yaml" },
  types: {
    string: {
      factory: "string()",
      import: { name: "string", from: "@/utils/validation/types" },
    },
  },
}).code;

describe("login with custom string factory", () => {
  it("adds custom import", () => {
    assert.ok(customCode.includes('import { string } from "@/utils/validation/types"'));
  });

  it("uses custom factory in defaults", () => {
    assert.ok(customCode.includes("email: string(),"));
    assert.ok(customCode.includes("password: string(),"));
  });
});
