const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

var NODE_ENV = process.env.NODE_ENV || 'development';

const myFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console({colorize: true})
    ],
});

logger.level = process.env.LOG_LEVEL || "info";

module.exports = logger;