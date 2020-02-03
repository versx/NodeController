import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';

const logDir = 'log';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const level = 'verbose';
const options: winston.LoggerOptions = {
    level: level,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.json(),
        /*
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        */
        winston.format.splat(),
        winston.format.prettyPrint(),
        winston.format.align(),
        winston.format.simple(),
        /*
        winston.format.printf(
            info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
        )
        */
    ),
    transports: [
        new winston.transports.Console({
            level: 'info',
            debugStdout: true,
            handleExceptions: true
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    ],
};
let logger: winston.Logger = winston.createLogger(options);

winston.exceptions.handle(new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }));

export { logger };