const COLLECTION = 'cloud.pixelboard.imageBoard';
const MAX_SIZE = 512;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Checks that the agent is authenticated via OAuth.
 */
function assertAuthenticated(agent) {
  if (!agent?.assertDid) throw new Error('You must be logged in to access your pixel board.');
  return agent.assertDid;
}

/**
 * Validates the pixel board data.
 * @param {string[]} pixels flat 1d array of #rrggbb colors
 * @param {number} size n for an n x n square board
 */
function validateBoard(pixels, size) {
  if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) {
    throw new Error(`Board size must be an integer from 1 to ${MAX_SIZE}.`);
  }
  if (!Array.isArray(pixels) || pixels.length !== size * size
    || !pixels.every((color) => typeof color === 'string' && HEX_COLOR.test(color))) {
    throw new Error(`Board pixels must contain exactly ${size * size} colors in #rrggbb format.`);
  }
}

/**
 * Creates a square canvas element of the given size.
 */
function canvasForSize(size) {
  if (typeof document === 'undefined') throw new Error('Pixel board conversion requires a browser canvas.');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

/**
 * Converts canvas to a png blob (async)
 */
function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode the pixel board as a PNG.'));
    }, 'image/png');
  });
}

/**
 * Converts a flat array of #rrggbb pixels to a PNG blob.
 */
function pixelsToPng(pixels, size) {
  const canvas = canvasForSize(size);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a 2D canvas context.');

  const imageData = context.createImageData(size, size);
  pixels.forEach((color, index) => {
    const offset = index * 4;
    imageData.data[offset] = parseInt(color.slice(1, 3), 16);
    imageData.data[offset + 1] = parseInt(color.slice(3, 5), 16);
    imageData.data[offset + 2] = parseInt(color.slice(5, 7), 16);
    imageData.data[offset + 3] = 255;
  });
  context.putImageData(imageData, 0, 0);
  return canvasToPng(canvas);
}

/**
 * Stores a flat array of #rrggbb pixels as a png blob in a new record; adds the new record to PDS.
 * The agent must be an authenticated @atproto/api Agent.
 * @param {object} agent
 * @param {string[]} pixels
 * @param {number} size Width and height of the square board
 * @returns {Promise<{uri: string, cid: string}>} Created record identifiers
 */
export async function saveBoard(agent, pixels, size) {
  const repo = assertAuthenticated(agent);
  validateBoard(pixels, size);

  const png = await pixelsToPng(pixels, size);
  const uploaded = await agent.uploadBlob(png);
  const image = uploaded?.data?.blob;
  if (!image) throw new Error('The PDS did not return a reference for the uploaded PNG.');

  const created = await agent.com.atproto.repo.createRecord({
    repo,
    collection: COLLECTION,
    record: { image, width: size, height: size },
  });
  if (!created?.data?.uri || !created?.data?.cid) {
    throw new Error('The PDS did not return identifiers for the created pixel board.');
  }
  return { uri: created.data.uri, cid: created.data.cid };
}

/**
 * Replaces the board record at the supplied record key with a new PNG.
 * The agent must be an authenticated @atproto/api Agent.
 * @param {object} agent
 * @param {string[]} pixels
 * @param {number} size Width and height of the square board
 * @param {string} rkey Record key of the board to update
 * @returns {Promise<{uri: string, cid: string}>} Updated record identifiers
 */
export async function updateBoard(agent, pixels, size, rkey) {
  const repo = assertAuthenticated(agent);
  validateBoard(pixels, size);
  if (typeof rkey !== 'string' || rkey.length === 0) {
    throw new Error('A pixel board record key is required.');
  }

  const png = await pixelsToPng(pixels, size);
  const uploaded = await agent.uploadBlob(png);
  const image = uploaded?.data?.blob;
  if (!image) throw new Error('The PDS did not return a reference for the uploaded PNG.');

  const updated = await agent.com.atproto.repo.putRecord({
    repo,
    collection: COLLECTION,
    rkey,
    record: { image, width: size, height: size },
  });
  if (!updated?.data?.uri || !updated?.data?.cid) {
    throw new Error('The PDS did not return identifiers for the updated pixel board.');
  }
  return { uri: updated.data.uri, cid: updated.data.cid };
}

function blobFromResponse(data) {
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return new Blob([data], { type: 'image/png' });
  }
  throw new Error('The PDS returned an invalid image blob.');
}

/**
 * Loads one of the logged-in user's records and returns its colors row by row.
 * @param {object} agent Authenticated @atproto/api Agent
 * @param {string} recordUriOrRkey Record AT URI or its record key
 * @returns {Promise<{size: number, pixels: string[]}>}
 */
export async function loadBoard(agent, recordUriOrRkey) {
  const repo = assertAuthenticated(agent);
  if (typeof recordUriOrRkey !== 'string' || recordUriOrRkey.length === 0) {
    throw new Error('A pixel board AT URI or record key is required.');
  }

  let rkey = recordUriOrRkey;
  if (recordUriOrRkey.startsWith('at://')) {
    const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(recordUriOrRkey);
    if (!match || match[1] !== repo || match[2] !== COLLECTION) {
      throw new Error('The AT URI must identify a record in your pixel board collection.');
    }
    rkey = match[3];
  }

  const result = await agent.com.atproto.repo.getRecord({
    repo,
    collection: COLLECTION,
    rkey,
  });
  const record = result?.data?.value;
  const size = record?.width;
  if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE || record.height !== size) {
    throw new Error('The selected record does not contain a valid square pixel board.');
  }

  const cid = record.image?.ref?.['$link'];
  if (typeof cid !== 'string') throw new Error('The selected record has no image blob reference.');

  const blobResult = await agent.com.atproto.sync.getBlob({ did: repo, cid });
  const png = blobFromResponse(blobResult?.data);
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser does not support decoding pixel board images.');
  }
  const bitmap = await createImageBitmap(png);
  try {
    if (bitmap.width !== size || bitmap.height !== size) {
      throw new Error('The PNG dimensions do not match the pixel board record.');
    }

    const canvas = canvasForSize(size);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Could not create a 2D canvas context.');
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, size, size);
    const pixels = Array.from({ length: size * size }, (_, index) => {
      const offset = index * 4;
      return `#${imageData.data[offset].toString(16).padStart(2, '0')}`
        + `${imageData.data[offset + 1].toString(16).padStart(2, '0')}`
        + `${imageData.data[offset + 2].toString(16).padStart(2, '0')}`;
    });
    return { size, pixels };
  } finally {
    bitmap.close();
  }
}
