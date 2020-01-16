import winston = require('winston');

const level = 'verbose';
const options: winston.LoggerOptions = {
    level: 'info',
    //format: winston.format.json(),
    defaultMeta: { service: 'controller' },
    transports: [
        new winston.transports.Console({
            level: level,
            debugStdout: true,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
        }),
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        //new winston.transports.File({ filename: 'error.log', level: 'error' }),
        //new winston.transports.File({ filename: 'combined.log' })
    ]
};
winston.configure(options);
winston.debug("Logging initialized at " + level + " level...");

export { winston };