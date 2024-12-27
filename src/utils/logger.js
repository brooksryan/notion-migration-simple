const winston = require('winston');
const path = require('path');
const fs = require('fs');

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

// Create date-based directory and filenames
function getLogPaths() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timestamp = date.toISOString().replace(/[:.]/g, '-').split('Z')[0];
  
  const logDir = path.join(__dirname, '../../logs', dateStr);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return {
    error: path.join(logDir, `error-${timestamp}Z.log`),
    combined: path.join(logDir, `combined-${timestamp}Z.log`)
  };
}

const logPaths = getLogPaths();

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
      filename: logPaths.error,
      level: 'error'
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: logPaths.combined
    })
  ]
});

module.exports = logger; 