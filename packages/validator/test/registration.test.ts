import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFixture } from "./test-utils.js";

const { validate } = loadFixture({
  name: "registration",
  openapi: { api: "registration.openapi.yaml" },
});

describe("registration fixture", () => {
  it("validates the OFS spec", () => {
    assert.deepEqual(validate(), []);
  });
});
