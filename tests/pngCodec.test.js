import test from "node:test";
import assert from "node:assert/strict";
import { createPngCodec, rgbaToPixels, snapshotDrawing } from "../src/storage/pngCodec.js";

function header(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new globalThis.Blob([bytes], { type: "image/png" });
}

test("snapshots reject sparse, transparent, malformed and unsupported canvas inputs", () => {
  for (const input of [
    null,
    {},
    { size: 30, pixels: [] },
    { size: 25, pixels: Array(625) },
    { size: 25, pixels: Array(625).fill(null) },
    { size: 25, pixels: Array(625).fill("#12345678") },
  ]) {
    assert.throws(() => snapshotDrawing(input), /Drawings require/);
  }
  const pixels = Array(625).fill("#ffffff");
  const snapshot = snapshotDrawing({ size: 25, pixels });
  pixels[0] = "#000000";
  assert.equal(snapshot.pixels[0], "#ffffff");
});

test("RGBA conversion keeps opaque colors and flattens transparency onto white", () => {
  assert.deepEqual(
    rgbaToPixels(new Uint8ClampedArray([18, 52, 86, 255, 0, 0, 0, 0, 0, 0, 0, 128])),
    ["#123456", "#ffffff", "#7f7f7f"],
  );
});

test("encoding writes opaque RGBA pixels and reports encoder failures", async () => {
  let captured;
  const canvas = {
    getContext: () => ({
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: (image) => {
        captured = image.data;
      },
    }),
    toBlob: (callback) => callback(header(25, 25)),
  };
  const codec = createPngCodec({ createCanvas: () => canvas });
  const png = await codec.encode({ size: 25, pixels: Array(625).fill("#aB1234") });
  assert.equal(png.type, "image/png");
  assert.equal(canvas.width, 25);
  assert.equal(canvas.height, 25);
  assert.deepEqual([...captured.slice(0, 4)], [171, 18, 52, 255]);
  canvas.toBlob = (callback) => callback(null);
  await assert.rejects(codec.encode({ size: 25, pixels: Array(625).fill("#ffffff") }), /encode/);
});

test("bad dimensions and headers fail before image decoding", async () => {
  let decoded = false;
  const codec = createPngCodec({
    decodeImage: () => {
      decoded = true;
    },
  });
  await assert.rejects(codec.decode(header(25, 25), { width: 512, height: 512 }), /dimensions/);
  await assert.rejects(
    codec.decode(new globalThis.Blob(["bad"]), { width: 25, height: 25 }),
    /valid PNG/,
  );
  await assert.rejects(codec.decode(header(40, 40), { width: 25, height: 25 }), /dimensions/);
  assert.equal(decoded, false);
});

test("decoding validates dimensions and closes image resources", async () => {
  let closed = 0;
  const bitmap = {
    width: 25,
    height: 25,
    close: () => {
      closed++;
    },
  };
  const rgba = new Uint8ClampedArray(625 * 4).fill(255);
  const codec = createPngCodec({
    decodeImage: async () => bitmap,
    createCanvas: () => ({
      getContext: () => ({
        drawImage() {},
        getImageData: () => ({ data: rgba }),
      }),
    }),
  });
  const drawing = await codec.decode(header(25, 25), { width: 25, height: 25 });
  assert.equal(drawing.size, 25);
  assert.ok(drawing.pixels.every((color) => color === "#ffffff"));
  assert.equal(closed, 1);
  bitmap.width = 40;
  await assert.rejects(codec.decode(header(25, 25), { width: 25, height: 25 }), /decode/);
  assert.equal(closed, 2);
});
