# avl-parser-bitrek

## Payload structure

```
Preamble: 4 bytes
AVL Payload Length: 4 bytes, Uint32
-- Start of AVL Payload --
    Codec ID: 1 byte (0x08)
    Record Count: 1 byte, Uint8
    Timestamp: 8 bytes, Uint64 / BigInt64
    Priority: 1 byte, Uint8
    -- Start of Record Payload --
        Lng: 4 bytes, Int32
        Lat: 4 bytes, Int32
        Height: 2 bytes, Int16
        Azimuth (Bearing): 2 bytes, Int16
        Satellite Count: 1 byte, Uint8
        Speed: 2 bytes, Int16
    -- End of Record Payload --
        (other record payloads)
    IO Payload: >= 6 bytes (not parsed)
    Record Count: 1 byte, Uint8 (same as earlier value)
-- End of AVL Payload --
CRC16: 4 bytes
```