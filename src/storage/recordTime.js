const BASE32 = "234567abcdefghijklmnopqrstuvwxyz";

/**
 * Reads a creation time from a TID when the proposed record has no timestamp field.
 * @param {string} id - The record key assigned by the PDS.
 * @returns {string} The ISO creation time, or the epoch for a non-TID legacy key.
 */
export function timeFromRecordKey(id) {
  if (!/^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/.test(id)) {
    return new Date(0).toISOString();
  }
  let value = 0n;
  for (const character of id) value = value * 32n + BigInt(BASE32.indexOf(character));
  const millis = Number((value >> 10n) / 1000n);
  return new Date(millis).toISOString();
}

