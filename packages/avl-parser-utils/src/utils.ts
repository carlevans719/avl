/**
 * Check if the Most Significant Bit is set on a given byte
 * @param byte The byte to check, expressed as a standard JS number type
 * @returns true if the MSB is set
 */
export const isMSBSet = (byte: number) => byte >> 7 === 1;

/**
 * Helper to get part of a given buffer wrapped in a DataView
 * @param buff The buffer to wrap
 * @param startPos The start index to subarray from
 * @param len The number of bytes to slice
 * @returns The DataView
 */
export const getDataView = (buff: Buffer, startPos: number, len: number) =>
  new DataView(new Uint8Array(buff.subarray(startPos, startPos + len)).buffer);
