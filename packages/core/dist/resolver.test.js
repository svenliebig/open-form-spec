import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveFieldStates } from "./resolver.js";
import { parseOFS } from "./parser.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplePath = resolve(__dirname, "../../../examples/registration.ofs.yaml");
describe("resolver", () => {
    const doc = parseOFS(examplePath);
    it("resolves unconditional required fields", () => {
        const result = resolveFieldStates(doc, { values: {} });
        assert.equal(result["email"], "required");
        assert.equal(result["password"], "required");
        assert.equal(result["accountType"], "required");
    });
    it("resolves unconditional optional fields", () => {
        const result = resolveFieldStates(doc, { values: {} });
        assert.equal(result["nickname"], "optional");
    });
    it("resolves context-based condition", () => {
        const withPhone = resolveFieldStates(doc, {
            values: {},
            context: { config: { requirePhone: true } },
        });
        assert.equal(withPhone["phone"], "required");
        const withoutPhone = resolveFieldStates(doc, {
            values: {},
            context: { config: { requirePhone: false } },
        });
        assert.equal(withoutPhone["phone"], "optional");
    });
    it("resolves field-based condition with 'is'", () => {
        const business = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS" },
        });
        assert.equal(business["companyName"], "required");
        const personal = resolveFieldStates(doc, {
            values: { accountType: "PERSONAL" },
        });
        assert.equal(personal["companyName"], "forbidden");
    });
    it("resolves field-based condition with 'in'", () => {
        const business = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS" },
        });
        assert.equal(business["taxId"], "required");
        const freelancer = resolveFieldStates(doc, {
            values: { accountType: "FREELANCER" },
        });
        assert.equal(freelancer["taxId"], "required");
        const personal = resolveFieldStates(doc, {
            values: { accountType: "PERSONAL" },
        });
        assert.equal(personal["taxId"], "forbidden");
    });
    it("resolves compound condition (all)", () => {
        const businessDE = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS" },
            context: { config: { region: "DE" } },
        });
        assert.equal(businessDE["vatNumber"], "required");
        const businessUS = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS" },
            context: { config: { region: "US" } },
        });
        assert.equal(businessUS["vatNumber"], "forbidden");
        const personalDE = resolveFieldStates(doc, {
            values: { accountType: "PERSONAL" },
            context: { config: { region: "DE" } },
        });
        assert.equal(personalDE["vatNumber"], "forbidden");
    });
    it("resolves cross-section reference", () => {
        const separateBilling = resolveFieldStates(doc, {
            values: {},
            crossSections: { preferences: { separateBilling: true } },
        });
        assert.equal(separateBilling["billingEmail"], "required");
        const noBilling = resolveFieldStates(doc, {
            values: {},
            crossSections: { preferences: { separateBilling: false } },
        });
        assert.equal(noBilling["billingEmail"], "optional");
    });
    it("resolves nested object fields", () => {
        const business = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS" },
        });
        assert.equal(business["address"], "required");
        assert.equal(business["address.street"], "required");
        assert.equal(business["address.city"], "required");
        assert.equal(business["address.state"], "optional");
    });
    it("resolves nested field with condition on parent field", () => {
        const us = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS", address: { country: "US" } },
        });
        assert.equal(us["address.state"], "required");
        const de = resolveFieldStates(doc, {
            values: { accountType: "BUSINESS", address: { country: "DE" } },
        });
        assert.equal(de["address.state"], "optional");
    });
    it("falls back to base state when no condition matches", () => {
        const noContext = resolveFieldStates(doc, { values: {} });
        assert.equal(noContext["phone"], "optional");
        assert.equal(noContext["companyName"], "forbidden");
        assert.equal(noContext["vatNumber"], "forbidden");
    });
});
