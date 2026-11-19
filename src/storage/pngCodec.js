/** Lossless conversion between the editor's opaque pixels and the PNG Blob Lexicon. */
const SIZES = [25, 40, 64];
const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Validates a drawing and copies it before asynchronous work can change its pixels.
 * @param {{size: number, pixels: string[]}} canvas - The editor snapshot.
 * @returns {{size: number, pixels: string[]}} An independent validated snapshot.
 */
export function snapshotDrawing(canvas) {
  if (
    !SIZES.includes(canvas?.size) ||
    !Array.isArray(canvas?.pixels) ||
    canvas.pixels.length !== canvas.size * canvas.size ||
    !Array.from(canvas.pixels).every((pixel) => typeof pixel === "string" && COLOR.test(pixel))
  ) {
    throw new Error("Drawings require size 25, 40, or 64 and size × size #rrggbb pixels.");
  }
  return { size: canvas.size, pixels: canvas.pixels.map((pixel) => pixel.toLowerCase()) };
}

/**
 * Converts RGBA bytes to the editor's colors, flattening transparency onto white.
 * @param {Uint8ClampedArray} rgba - Four bytes per pixel from the PNG decoder.
 * @returns {string[]} Opaque lowercase hex colors in row-major order.
 */
export function rgbaToPixels(rgba) {
  const pixels = [];
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const alpha = rgba[offset + 3] / 255;
    const channels = Array.from(rgba.slice(offset, offset + 3), (channel) =>
      Math.round(channel * alpha + 255 * (1 - alpha)),
    );
    pixels.push(`#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`);
  }
  return pixels;
}

/**
 * Uses native browser PNG encoding and decoding without drawing tools or page changes.
 * @param {object} [options] - Browser primitives may be injected by codec tests.
 * @param {Function} [options.createCanvas] - Creates a detached canvas element.
 * @param {Function} [options.decodeImage] - Decodes an image Blob to an ImageBitmap.
 * @returns {{encode: Function, decode: Function}} The asynchronous PNG codec.
 */
export function createPngCodec({
  createCanvas = () => globalThis.document.createElement("canvas"),
  decodeImage = (blob) => globalThis.createImageBitmap(blob, { colorSpaceConversion: "none" }),
} = {}) {
  /**
   * Encodes native-resolution pixels; the displayed grid and zoom are never included.
   * @param {{size: number, pixels: string[]}} drawing - The drawing to encode.
   * @returns {Promise<Blob>} A lossless image/png Blob.
   */
  async function encode(drawing) {
    const snapshot = snapshotDrawing(drawing);
    const canvas = createCanvas();
    canvas.width = canvas.height = snapshot.size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PNG encoding is unavailable in this browser.");
    const image = context.createImageData(snapshot.size, snapshot.size);
    snapshot.pixels.forEach((pixel, index) => {
      const value = Number.parseInt(pixel.slice(1), 16);
      image.data.set([value >> 16, (value >> 8) & 255, value & 255, 255], index * 4);
    });
    context.putImageData(image, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not encode the drawing as PNG.");
    return blob;
  }

  /**
   * Checks the PNG header and record dimensions before decoding pixels for the editor.
   * @param {Blob} blob - The downloaded PNG data.
   * @param {{width: number, height: number}} dimensions - Dimensions stored in the record.
   * @returns {Promise<{size: number, pixels: string[]}>} The editable drawing.
   */
  async function decode(blob, { width, height }) {
    if (!SIZES.includes(width) || height !== width) {
      throw new Error("This drawing's dimensions are not supported by the editor.");
    }
    const header = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (header.length < 24 || signature.some((byte, index) => header[index] !== byte)) {
      throw new Error("The saved image is not a valid PNG.");
    }
    const view = new DataView(header.buffer);
    if (view.getUint32(16) !== width || view.getUint32(20) !== height) {
      throw new Error("PNG dimensions do not match the saved drawing.");
    }
    let bitmap;
    try {
      bitmap = await decodeImage(blob);
      if (bitmap.width !== width || bitmap.height !== height) {
        throw new Error("Decoded PNG dimensions do not match the saved drawing.");
      }
      const canvas = createCanvas();
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG decoding is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0);
      const pixels = rgbaToPixels(context.getImageData(0, 0, width, height).data);
      return snapshotDrawing({ size: width, pixels });
    } catch (cause) {
      throw new Error("Could not decode the saved PNG drawing.", { cause });
    } finally {
      bitmap?.close?.();
    }
  }

  return { encode, decode };
}
