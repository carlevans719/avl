import { IAVLPayload } from 'avl-parser-utils';
import { getConfig } from './config';
import { getLogger } from './logger';
import { getCollection } from './db';
import { getServer } from './server';
import { GPS_DATA_RECEIVED } from './constants';

export const start = async () => {
  const config = await getConfig();
  const logger = await getLogger(config.logger);
  const collection = await getCollection(config.database, logger);
  const server = await getServer(config, logger, collection);

  const l = logger(module);
  server.on(GPS_DATA_RECEIVED, async (data: IAVLPayload) => {
    l.info(`Received GPS data`);
    l.debug(data);
    try {
      await collection.insert(data);
      l.info(`Inserted GPS payload to database`);
    } catch (ex) {
      l.error(ex);
    }
  });

  // server.ioOn('GET_DATA', (data) => {
  //   // const objUI = {
  //   //   type: 'marker',
  //   //   deviceId: deviceId,
  //   //   utcDateTime: new Date(utcDateTime).toUTCString(),
  //   //   altitude: mapData['altitude'],
  //   //   speed: mapData['speed'],
  //   //   heading: mapData['heading'],
  //   //   lat: lat,
  //   //   lng: lng,
  //   // };
  //   // io.emit('map message', objUI);
  //   // l.debug('gps position broadcasted -> map UI');
  //   server.ioEmit(collection.find({}).toArray());
  // });

  await server.start();
};
