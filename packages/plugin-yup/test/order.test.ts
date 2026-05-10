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

// --- With messages ---

const { code: msgCode } = loadFixture({
  name: "order",
  testResultName: "order.with-messages",
  openapi: { api: "order.openapi.yaml" },
  enumImport: "@/api/generated/backend/index.schemas",
  messages: {
    "string:enum": {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_OPTION",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
  },
});

describe("order with messages", () => {
  it("imports the message constant", () => {
    assert.ok(
      msgCode.includes(
        'import { VALIDATION_MESSAGES } from "@/constants/validation"',
      ),
    );
  });

  it("passes message to required() for enum field status", () => {
    assert.ok(
      msgCode.includes(
        "status: fields.status.required(VALIDATION_MESSAGES.REQUIRED_OPTION),",
      ),
    );
  });

  it("does not pass message to required() for plain string field customerName", () => {
    assert.ok(
      msgCode.includes("customerName: fields.customerName.required(),"),
    );
  });

  it("does not pass message to optional() for enum field priority (no optional message configured)", () => {
    assert.ok(msgCode.includes("priority: fields.priority.optional(),"));
  });

  it("does not pass message to optional() for plain string field notes", () => {
    assert.ok(msgCode.includes("notes: fields.notes.optional(),"));
  });
});

// --- With messages for base string type ---

const { code: stringMsgCode } = loadFixture({
  name: "order",
  testResultName: "order.with-string-messages",
  openapi: { api: "order.openapi.yaml" },
  enumImport: "@/api/generated/backend/index.schemas",
  messages: {
    string: {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_TEXT",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
  },
});

describe("order with string base messages", () => {
  it("passes message to required() for plain string field customerName", () => {
    assert.ok(
      stringMsgCode.includes(
        "customerName: fields.customerName.required(VALIDATION_MESSAGES.REQUIRED_TEXT),",
      ),
    );
  });

  it("passes message to required() for enum field status (falls back to string)", () => {
    assert.ok(
      stringMsgCode.includes(
        "status: fields.status.required(VALIDATION_MESSAGES.REQUIRED_TEXT),",
      ),
    );
  });
});

// --- With messages priority: string:enum overrides string ---

const { code: priorityMsgCode } = loadFixture({
  name: "order",
  testResultName: "order.with-priority-messages",
  openapi: { api: "order.openapi.yaml" },
  enumImport: "@/api/generated/backend/index.schemas",
  messages: {
    string: {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_TEXT",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
    "string:enum": {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_OPTION",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
  },
});

describe("order with message priority (string:enum over string)", () => {
  it("uses string:enum message for enum field status", () => {
    assert.ok(
      priorityMsgCode.includes(
        "status: fields.status.required(VALIDATION_MESSAGES.REQUIRED_OPTION),",
      ),
    );
  });

  it("uses string message for plain string field customerName", () => {
    assert.ok(
      priorityMsgCode.includes(
        "customerName: fields.customerName.required(VALIDATION_MESSAGES.REQUIRED_TEXT),",
      ),
    );
  });
});
