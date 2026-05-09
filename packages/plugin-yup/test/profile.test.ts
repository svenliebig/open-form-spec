import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadFixture } from "./test-utils.js";

// --- Without format overrides ---

const { code: defaultCode } = loadFixture({
  name: "profile",
  testResultName: "profile.default",
  openapi: { api: "profile.openapi.yaml" },
});

describe("profile without format overrides", () => {
  it("uses yup.string() for plain string, email, and date fields", () => {
    assert.ok(defaultCode.includes("name: yup.string(),"));
    assert.ok(defaultCode.includes("email: yup.string(),"));
    assert.ok(defaultCode.includes("birthDate: yup.string(),"));
  });

  it("uses yup.number() for integer and number fields", () => {
    assert.ok(defaultCode.includes("age: yup.number().integer(),"));
    assert.ok(defaultCode.includes("score: yup.number(),"));
  });
});

// --- With format overrides ---

const { code: customCode } = loadFixture({
  name: "profile",
  testResultName: "profile.custom",
  openapi: { api: "profile.openapi.yaml" },
  types: {
    string: {
      factory: "string()",
      import: { name: "string", from: "@/utils/validation/types" },
    },
    "string:date": {
      factory: "dateString()",
      import: { name: "dateString", from: "@/utils/validation/date-string" },
    },
    "string:email": {
      factory: "emailString()",
      import: { name: "emailString", from: "@/utils/validation/email" },
    },
  },
});

describe("profile with format overrides", () => {
  it("imports all custom factories", () => {
    assert.ok(customCode.includes('import { string } from "@/utils/validation/types"'));
    assert.ok(customCode.includes('import { dateString } from "@/utils/validation/date-string"'));
    assert.ok(customCode.includes('import { emailString } from "@/utils/validation/email"'));
  });

  it("uses plain string() for name (no format)", () => {
    assert.ok(customCode.includes("name: string(),"));
  });

  it("uses emailString() for email (format: email)", () => {
    assert.ok(customCode.includes("email: emailString(),"));
  });

  it("uses dateString() for birthDate (format: date)", () => {
    assert.ok(customCode.includes("birthDate: dateString(),"));
  });

  it("falls back to yup.number().integer() for integer (no override)", () => {
    assert.ok(customCode.includes("age: yup.number().integer(),"));
  });
});
