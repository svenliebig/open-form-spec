import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./validator.js";
import { extractEnumsFromOpenAPI } from "./openapi.js";
import { parseOFS } from "@ofs/core";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const schemaPath = resolve(__dirname, "../../../schema.json");
const examplePath = resolve(__dirname, "../../../examples/registration.ofs.yaml");
const openApiPath = resolve(__dirname, "../../../examples/registration.openapi.yaml");
describe("validator", () => {
    it("validates a correct OFS document with OpenAPI enum check", () => {
        const doc = parseOFS(examplePath);
        const apiEnums = extractEnumsFromOpenAPI(openApiPath);
        const errors = validate(doc, {
            schemaPath,
            openApiEnums: { api: apiEnums },
        });
        assert.deepEqual(errors, []);
    });
    it("reports schema errors for invalid documents", () => {
        const invalid = { section: "test" };
        const errors = validate(invalid, { schemaPath });
        assert.ok(errors.length > 0);
        assert.ok(errors.some((e) => e.message.includes("dto")));
    });
    it("reports unknown enum aliases in conditions", () => {
        const doc = {
            section: "test",
            dto: "Test",
            fields: {
                myField: {
                    state: "optional",
                    when: [
                        { field: "other", is: "UnknownEnum.VALUE", then: "required" },
                    ],
                },
            },
        };
        const errors = validate(doc, { schemaPath });
        assert.ok(errors.some((e) => e.message.includes("UnknownEnum")));
    });
    it("accepts known enum aliases", () => {
        const doc = {
            section: "test",
            dto: "Test",
            imports: { enums: { Status: "api#Status" } },
            fields: {
                myField: {
                    state: "optional",
                    when: [{ field: "other", is: "Status.ACTIVE", then: "required" }],
                },
            },
        };
        const errors = validate(doc, { schemaPath });
        assert.deepEqual(errors, []);
    });
    it("validates enum imports against OpenAPI enums", () => {
        const doc = {
            section: "test",
            dto: "Test",
            imports: { enums: { Status: "api#Status" } },
            fields: { myField: { state: "required" } },
        };
        const errors = validate(doc, {
            schemaPath,
            openApiEnums: { api: { UserRole: ["ADMIN", "USER"] } },
        });
        assert.ok(errors.some((e) => e.message.includes("Status")));
        assert.ok(errors.some((e) => e.message.includes("not found")));
    });
    it("reports invalid enum values against OpenAPI", () => {
        const doc = {
            section: "test",
            dto: "Test",
            imports: { enums: { AccountType: "api#AccountType" } },
            fields: {
                myField: {
                    state: "optional",
                    when: [
                        {
                            field: "type",
                            is: "AccountType.INVALID_VALUE",
                            then: "required",
                        },
                    ],
                },
            },
        };
        const apiEnums = extractEnumsFromOpenAPI(openApiPath);
        const errors = validate(doc, {
            schemaPath,
            openApiEnums: { api: apiEnums },
        });
        assert.ok(errors.some((e) => e.message.includes("INVALID_VALUE")));
        assert.ok(errors.some((e) => e.message.includes("does not exist")));
    });
    it("accepts valid enum values against OpenAPI", () => {
        const doc = {
            section: "test",
            dto: "Test",
            imports: { enums: { AccountType: "api#AccountType" } },
            fields: {
                myField: {
                    state: "optional",
                    when: [
                        { field: "type", is: "AccountType.BUSINESS", then: "required" },
                    ],
                },
            },
        };
        const apiEnums = extractEnumsFromOpenAPI(openApiPath);
        const errors = validate(doc, {
            schemaPath,
            openApiEnums: { api: apiEnums },
        });
        assert.deepEqual(errors, []);
    });
    it("validates enum values in 'in' arrays", () => {
        const doc = {
            section: "test",
            dto: "Test",
            imports: { enums: { Country: "api#Country" } },
            fields: {
                myField: {
                    state: "optional",
                    when: [
                        {
                            field: "country",
                            in: ["Country.DE", "Country.INVALID"],
                            then: "required",
                        },
                    ],
                },
            },
        };
        const apiEnums = extractEnumsFromOpenAPI(openApiPath);
        const errors = validate(doc, {
            schemaPath,
            openApiEnums: { api: apiEnums },
        });
        assert.equal(errors.length, 1);
        assert.ok(errors[0].message.includes("INVALID"));
    });
    it("reports conditions without a source", () => {
        const doc = {
            section: "test",
            dto: "Test",
            fields: {
                myField: {
                    state: "optional",
                    when: [{ is: "something", then: "required" }],
                },
            },
        };
        const errors = validate(doc, { schemaPath });
        assert.ok(errors.some((e) => e.message.includes("source")));
    });
    it("reports conditions without a comparator", () => {
        const doc = {
            section: "test",
            dto: "Test",
            fields: {
                myField: {
                    state: "optional",
                    when: [{ field: "other", then: "required" }],
                },
            },
        };
        const errors = validate(doc, { schemaPath });
        assert.ok(errors.some((e) => e.message.includes("comparator")));
    });
});
