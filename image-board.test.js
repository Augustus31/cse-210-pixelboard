/* global URL */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = JSON.parse(
  readFileSync(new URL("./lexicons/app/image-board.json", import.meta.url), "utf8")
);
const record = schema.defs.main.record;

// Some basic tests for the lexicon.
test("Lexicon version should be 1", () => {
  assert.equal(schema.lexicon, 1);
});

test("Lexicon should use a valid basic NSID structure", () => {
  const parts = schema.id.split(".");
  assert.ok(parts.length >= 3);
  assert.match(parts.at(-1), /^[A-Za-z][A-Za-z0-9]*$/);
});

test("Record should use TID keys", () => {
  assert.equal(schema.defs.main.key, "tid");
});

test("Required fields should include image, width and height", () => {
  for (const field of ["image", "width", "height"]) {
    assert.ok(record.required.includes(field));
  }
});

test("Image should be a PNG blob", () => {
  assert.equal(record.properties.image.type, "blob");
  assert.ok(record.properties.image.accept.includes("image/png"));
});

test("Canvas dimensions should range from 1 to 512", () => {
  for (const dimension of ["width", "height"]) {
    const property = record.properties[dimension];

    assert.equal(property.type, "integer");
    assert.equal(property.minimum, 1);
    assert.equal(property.maximum, 512);
  }
});
