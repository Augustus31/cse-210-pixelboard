import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BOARD_COLLECTION } from "../src/storage/oauthAgent.js";

const schema = JSON.parse(readFileSync(
  new globalThis.URL("../lexicons/app/image-board.json", import.meta.url), "utf8",
));

test("store collection matches the merged Lexicon and timestamps remain optional", () => {
  assert.equal(schema.id, BOARD_COLLECTION);
  const record = schema.defs.main.record;
  for (const field of ["createdAt", "updatedAt"]) {
    assert.equal(record.properties[field].type, "string");
    assert.equal(record.properties[field].format, "datetime");
    assert.equal(record.required.includes(field), false);
  }
  assert.equal(record.properties.width.maximum, 512);
  assert.equal(record.properties.height.maximum, 512);
  assert.equal(record.properties.image.maxSize, undefined);
});
