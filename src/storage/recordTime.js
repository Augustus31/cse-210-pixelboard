const BASE32 = "234567abcdefghijklmnopqrstuvwxyz";

/**
 * Reads the creation time from a TID record key for drawings without timestamps.
 * @param {string} id - The record key assigned by the PDS.
 * @returns {string} The ISO creation time, or January 1, 1970 if the key is not a TID.
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

