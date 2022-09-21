import { IAVLPayload } from './avl-payload.interface';

export abstract class IParser {
  static canParse: (buffer: Buffer) => boolean;
  static parse: (buffer: Buffer) => IAVLPayload | { imei: string };
}
