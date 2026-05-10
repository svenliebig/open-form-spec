import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadFixture } from "./test-utils.js";

const { code } = loadFixture({
  name: "login",
  testResultName: "login.no-openapi",
});

describe("yup generation without OpenAPI context", () => {
  it("falls back to yup.mixed() in defaults", () => {
    assert.ok(code.includes("email: yup.mixed(),"));
    assert.ok(code.includes("password: yup.mixed(),"));
  });

  it("derives Fields type from defaults", () => {
    assert.ok(code.includes("export type LoginFields = ReturnType<typeof loginDefaults>;"));
  });

  it("uses fields ref in shape", () => {
    assert.ok(code.includes("email: fields.email.required(),"));
  });
});
