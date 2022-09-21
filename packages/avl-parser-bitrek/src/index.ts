import {
  getDataView,
  IAVLPayload,
  IAVLRecordPayload,
  IParser,
} from 'avl-parser-utils';

export default class BitrekParser implements IParser {
  private static readonly BITREK_CODEC = 0x08;
  private static readonly AVL_LENGTH_WITHOUT_RECORDS = 18;
  private static readonly RECORD_LENGTH = 15;

  /**
   * Parse out the GPS payloads from an AVL packet
   * @param buff The AVL payload
   * @param recordCount The number of records claimed to be contained in the payload
   * @returns The parsed records
   */
  private static parseRecords(buff: Buffer, recordCount: number) {
    const records: IAVLRecordPayload[] = [];

    const totalRecordLen = recordCount * BitrekParser.RECORD_LENGTH;
    for (
      let offset = 0;
      offset < totalRecordLen;
      offset += BitrekParser.RECORD_LENGTH
    ) {
      records.push({
        lng: getDataView(buff, offset, 4).getInt32(0) / 10_000_000,
        lat: getDataView(buff, offset + 4, 4).getInt32(0) / 10_000_000,
        altitude: getDataView(buff, offset + 8, 2).getInt16(0),
        azimuth: getDataView(buff, offset + 10, 2).getInt16(0),
        satelliteCount: buff[offset + 12],
        speed: getDataView(buff, offset + 13, 2).getInt16(0),
      });
    }

    return records;
  }

  /**
   * Check if a packet is in the Bitrek format or not
   * @param buff The whole potential Bitrek packet
   * @returns true if the packet appears to be in the Bitrek format
   */
  public static canParse(buff: Buffer) {
    return (
      (buff.length === 17 && buff[0] === 0 && buff[1] === 15) ||
      buff[8] === BitrekParser.BITREK_CODEC
    );
  }

  /**
   * Parse an AVL payload and all its GPS records
   * @param buff The AVL payload
   * @returns The parsed payload
   */
  public static parse(buff: Buffer) {
    if (buff.length === 17) {
      // this is a connection negotiation packet
      return { imei: buff.toString('ascii').substring(2) };
    }

    const codec = buff[0];
    const recordCountA = buff[1];
    const recordCountB = buff[buff.length - 1];

    // Sanity checks
    if (codec !== BitrekParser.BITREK_CODEC) {
      throw new Error('Invalid packet; unsupported codec');
    }

    if (recordCountA !== recordCountB) {
      throw new Error('Invalid packet: record count mismatch');
    }

    const minLength =
      BitrekParser.AVL_LENGTH_WITHOUT_RECORDS +
      recordCountA * BitrekParser.RECORD_LENGTH;

    if (buff.length < minLength) {
      throw new Error('Invalid packet; length too short');
    }

    const rawPacket: IAVLPayload = {
      codec,
      recordCount: recordCountA,
      timestamp: Number(getDataView(buff, 2, 8).getBigInt64(0)),
      priority: buff[10],
      records: BitrekParser.parseRecords(
        buff.subarray(11, 11 + recordCountA * BitrekParser.RECORD_LENGTH),
        recordCountA,
      ),
      ioData: buff.subarray(
        11 + recordCountA * BitrekParser.RECORD_LENGTH,
        buff.length - 1,
      ),
    };

    return rawPacket;
  }
}
