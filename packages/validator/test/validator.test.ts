import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { OFSDocument } from "@open-form-spec/types";
import { extractEnumsFromOpenAPI } from "../src/openapi.js";
import { validate } from "../src/validator.js";

const validatorRoot = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../..",
);
const fixturesDir = resolve(validatorRoot, "test/fixtures");
const schemaPath = resolve(validatorRoot, "../../schema.json");

describe("validator", () => {
  it("reports schema errors for invalid documents", () => {
    const invalid = { section: "test" } as unknown as OFSDocument;
    const errors = validate(invalid, { schemaPath });
    assert.ok(errors.length > 0);
    assert.ok(errors.some((e) => e.message.includes("dto")));
  });

  it("reports unknown enum aliases in conditions", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      fields: {
        other: { state: "required" },
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
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      imports: { enums: { Status: "api#Status" } },
      fields: {
        other: { state: "required" },
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
    const doc: OFSDocument = {
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
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      imports: { enums: { AccountType: "api#AccountType" } },
      fields: {
        type: { state: "required" },
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
    const openApiPath = resolve(fixturesDir, "registration.openapi.yaml");
    const apiEnums = extractEnumsFromOpenAPI(openApiPath);
    const errors = validate(doc, {
      schemaPath,
      openApiEnums: { api: apiEnums },
    });
    assert.ok(errors.some((e) => e.message.includes("INVALID_VALUE")));
    assert.ok(errors.some((e) => e.message.includes("does not exist")));
  });

  it("accepts valid enum values against OpenAPI", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      imports: { enums: { AccountType: "api#AccountType" } },
      fields: {
        type: { state: "required" },
        myField: {
          state: "optional",
          when: [
            { field: "type", is: "AccountType.BUSINESS", then: "required" },
          ],
        },
      },
    };
    const openApiPath = resolve(fixturesDir, "registration.openapi.yaml");
    const apiEnums = extractEnumsFromOpenAPI(openApiPath);
    const errors = validate(doc, {
      schemaPath,
      openApiEnums: { api: apiEnums },
    });
    assert.deepEqual(errors, []);
  });

  it("validates enum values in 'in' arrays", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      imports: { enums: { Country: "api#Country" } },
      fields: {
        country: { state: "required" },
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
    const openApiPath = resolve(fixturesDir, "registration.openapi.yaml");
    const apiEnums = extractEnumsFromOpenAPI(openApiPath);
    const errors = validate(doc, {
      schemaPath,
      openApiEnums: { api: apiEnums },
    });
    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.includes("INVALID"));
  });

  it("reports conditions without a source", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      fields: {
        myField: {
          state: "optional",
          when: [{ is: "something", then: "required" } as any],
        },
      },
    };
    const errors = validate(doc, { schemaPath });
    assert.ok(errors.some((e) => e.message.includes("source")));
  });

  it("reports conditions without a comparator", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      fields: {
        other: { state: "required" },
        myField: {
          state: "optional",
          when: [{ field: "other", then: "required" }],
        },
      },
    };
    const errors = validate(doc, { schemaPath });
    assert.ok(errors.some((e) => e.message.includes("comparator")));
  });

  it("reports unknown field references with suggestion", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      fields: {
        enabled: { state: "required" },
        detail: {
          state: "forbidden",
          when: [{ field: "enbled", is: true, then: "required" }],
        },
      },
    };
    const errors = validate(doc, { schemaPath });
    assert.ok(errors.some((e) => e.message.includes("enbled")));
    assert.ok(errors.some((e) => e.message.includes("does not exist")));
    assert.ok(errors.some((e) => e.message.includes("Did you mean 'enabled'?")));
  });

  it("skips field reference validation for cross-section references", () => {
    const doc: OFSDocument = {
      section: "test",
      dto: "Test",
      fields: {
        myField: {
          state: "optional",
          when: [
            { section: "other", field: "nonExistent", is: true, then: "required" },
          ],
        },
      },
    };
    const errors = validate(doc, { schemaPath });
    assert.ok(!errors.some((e) => e.message.includes("does not exist")));
  });
});
