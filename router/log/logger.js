var winston = require('winston');

var logger = winston.createLogger({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: true })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({ json: false, timestamp: true })
  ],
  exitOnError: false
});

module.exports = logger;
