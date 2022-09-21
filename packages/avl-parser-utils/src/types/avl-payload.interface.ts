export interface IAVLRecordPayload {
  lng: number;
  lat: number;
  altitude: number;
  azimuth: number;
  satelliteCount: number;
  speed: number;
}

export interface IAVLPayload {
  codec: number;
  recordCount: number;
  timestamp: number;
  priority: number;
  records: IAVLRecordPayload[];
  ioData: any;
}
