import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFixture } from "./test-utils.js";

const { validate } = loadFixture({ name: "passport-faulty" });

describe("passport-faulty fixture", () => {
  it("reports the typo in field reference 'hasPassports'", () => {
    const errors = validate();
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /hasPassports/);
    assert.match(errors[0].message, /does not exist/);
  });

  it("suggests 'hasPassport' as a correction", () => {
    const errors = validate();
    assert.match(errors[0].message, /Did you mean 'hasPassport'\?/);
  });

  it("points to the correct path", () => {
    const errors = validate();
    assert.equal(errors[0].path, "/fields/passportNumber/when/0/field");
  });
});
