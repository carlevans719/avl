import { createLogger, format, transports, addColors } from 'winston';

const { colorize, combine, timestamp, label, printf } = format;

// TODO: log level
export const getLogger = (config) => (module) => {
  const path = module.filename.split('\\').slice(-1).join('/');

  const colors = {
    INFO: 'green',
    DEBUG: 'yellow',
    ERROR: 'red',
  };

  addColors(colors);

  return createLogger({
    transports: [
      new transports.Console({
        format: combine(
          colorize(),
          timestamp(),
          label({ label: path }),
          printf(
            (info) =>
              `${info.timestamp} ${info.level.toUpperCase()} [${info.label}]: ${
                info.message || ''
              } ${
                info.meta && Object.keys(info.meta).length
                  ? '\n\t' + JSON.stringify(info.meta)
                  : ''
              }`,
          ),
        ),
      }),
    ],
  });
};

export default getLogger;
