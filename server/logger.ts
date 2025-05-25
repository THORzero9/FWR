import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const loggerOptions: pino.LoggerOptions = {
  level: isProduction ? 'info' : 'debug', // More verbose in dev
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
};

if (!isProduction) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname', // Don't show pid and hostname in dev
    },
  };
}

const logger = pino(loggerOptions);

export default logger;
