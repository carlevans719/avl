import joi from 'joi';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const dbSchema = joi
  .object({
    mongoUri: joi.string().required().uri(),
    gpsCollection: joi.string().required(),
  })
  .options({
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

const loggerSchema = joi
  .object({
    logLevel: joi.string().required().allow('1', '2', '3', '4', '5'),
  })
  .options({
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

const serverSchema = joi
  .object({
    sessionSecret: joi.string().required().min(16),
    httpPort: joi.number().min(1).max(65535).required(),
    httpHost: joi
      .string()
      .ip({ version: 'ipv4', cidr: 'forbidden' })
      .default('127.0.0.1'),
    tcpPort: joi.number().min(1).max(65535).required(),
    tcpHost: joi
      .string()
      .ip({ version: 'ipv4', cidr: 'forbidden' })
      .default('127.0.0.1'),
    tcpIdleTimeout: joi.number().min(0).default(30000),
    validUsername: joi.string().required().min(1),
  })
  .options({
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  });

export const getConfig = () => {
  const database = dbSchema.validate(process.env);
  const logger = loggerSchema.validate(process.env);
  const server = serverSchema.validate(process.env);
  if (database.error != null) {
    throw new Error(database.error.message);
  }
  if (logger.error != null) {
    throw new Error(logger.error.message);
  }
  if (server.error != null) {
    throw new Error(server.error.message);
  }

  return {
    database: database.value,
    logger: logger.value,
    server: server.value,
  };
};
