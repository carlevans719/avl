import { MongoClient } from 'mongodb';

export const getCollection = async (config, logger) => {
  const l = logger(module);
  l.info('Initialising database');
  const client = new MongoClient(config.mongoUri, { useUnifiedTopology: true });
  const db = (await client.connect()).db();
  l.info(`Using db collection ${config.gpsCollection}`);
  return db.collection(config.gpsCollection);
};
