const winston = require('winston');
const path = require('path');

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  basic: 2,
  detailed: 3
};

// Custom colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  basic: 'cyan',
  detailed: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'basic',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, context }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      if (context) {
        log += `\nContext: ${JSON.stringify(context, null, 2)}`;
      }
      if (stack) {
        log += `\nStack: ${stack}`;
      }
      return log;
    })
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true })
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger; 