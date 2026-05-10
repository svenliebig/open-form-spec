import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFixture } from "./test-utils.js";

const { code, validate } = loadFixture({
  name: "checkout",
  openapi: { api: "checkout.openapi.yaml" },
});

// --- With messages for when conditions ---

const { code: msgCode } = loadFixture({
  name: "checkout",
  testResultName: "checkout.with-messages",
  openapi: { api: "checkout.openapi.yaml" },
  messages: {
    string: {
      required: {
        factory: "VALIDATION_MESSAGES.REQUIRED_TEXT",
        import: { name: "VALIDATION_MESSAGES", from: "@/constants/validation" },
      },
    },
  },
});

describe("checkout with messages in when conditions", () => {
  it("passes message in then callback for single when", () => {
    assert.ok(
      msgCode.includes(
        "then: (s: yup.Schema) => s.required(VALIDATION_MESSAGES.REQUIRED_TEXT)",
      ),
    );
  });

  it("passes message in simple required field", () => {
    assert.ok(
      msgCode.includes(
        "email: fields.email.required(VALIDATION_MESSAGES.REQUIRED_TEXT),",
      ),
    );
  });

  it("does not pass message for forbidden state", () => {
    assert.ok(
      msgCode.includes("otherwise: () => yup.mixed().optional().strip()"),
    );
  });
});

describe("checkout yup generation (end-to-end)", () => {
  it("validates the OFS spec", () => {
    assert.deepEqual(validate(), []);
  });

  it("exports defaults and Fields type", () => {
    assert.ok(code.includes("export const checkoutDefaults = () => ({"));
    assert.ok(code.includes("export type CheckoutFields = ReturnType<typeof checkoutDefaults>;"));
  });

  it("exports generic checkoutSchema function", () => {
    assert.ok(code.includes("export function checkoutSchema<T extends Partial<CheckoutFields>>(overrides?: T)"));
  });

  it("spreads defaults with overrides", () => {
    assert.ok(code.includes("const fields = { ...checkoutDefaults(), ...overrides };"));
  });

  // --- Fields ---

  it("generates email as required via fields ref", () => {
    assert.ok(code.includes("email: fields.email.required(),"));
  });

  it("generates conditional fields with fields ref", () => {
    assert.ok(code.includes('cardNumber: fields.cardNumber.when("paymentMethod"'));
  });

  // --- Nested ---

  it("generates shippingAddress as nested object", () => {
    assert.ok(code.includes("shippingAddress: yup.object().shape({"));
  });

  it("uses callback form in nested otherwise", () => {
    assert.ok(!code.includes("otherwise: () => yup.object().required()"));
  });

  // --- Helpers ---

  it("includes getPath helper for context access", () => {
    assert.ok(code.includes("function getPath("));
  });
});
