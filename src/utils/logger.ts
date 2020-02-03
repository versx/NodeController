import * as winston from 'winston';

const level = 'verbose';
const options: winston.LoggerOptions = {
    level: level,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.json(),
        //winston.format.timestamp(),
        winston.format.splat(),
        winston.format.prettyPrint(),
        winston.format.align(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console({
            level: 'info',
            debugStdout: true,
            handleExceptions: true
        }),
        new winston.transports.File({
            filename: 'error.log',
            level: 'error'
        }),
        new winston.transports.File({ 
            filename: 'combined.log'
        })
    ],
};
let logger: winston.Logger = winston.createLogger(options);

winston.exceptions.handle(new winston.transports.File({ filename: 'exceptions.log' }));

export { logger };