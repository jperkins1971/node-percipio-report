const moment = require('moment');

const config = {};

// Indicates a name for the configuration
config.customer = 'none';
config.startTimestamp = moment()
  .utc()
  .format('YYYYMMDD_HHmmss');

// DEBUG Options - Enables the check for Fiddler, if running the traffic is routed thru Fiddler
config.debug = {};
// Check for fiddler
config.debug.checkFiddler = false;
// Fiddler IP address
config.debug.fiddlerAddress = '127.0.0.1';
// Fiddler Port
config.debug.fiddlerPort = '8888';
// Debug logging
// One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
config.debug.loggingLevel = 'info';
config.debug.logpath = 'logs';
config.debug.logFile = `app_${config.startTimestamp}.log`;

// Site
config.site = {};
// Base URI to Percipio API
config.site.baseuri = 'https://api.percipio.com';
// ORG Id
config.site.orgid = null;
// Bearer Token
config.site.bearer = null;

// Default Report Request Parameters to /reporting end point
config.report = {};
config.report.type = 'learning-activity';
config.report.request = {};
config.report.request.start = null;
config.report.request.end = null;
config.report.request.timeframe = 'DAY';
config.report.request.audience = null;
config.report.request.locale = null;
config.report.request.contentType = null;
config.report.request.sort = {};
config.report.request.sort.field = 'lastAccessDate';
config.report.request.sort.order = 'desc';
config.report.request.status = null;

config.report.request.sftpId = null;
config.report.request.fileMask = null;
config.report.request.folderName = null;
config.report.request.formatType = 'JSON';

// Output
config.output = {};
// Path to save data
config.output.path = 'results';
// File name for the data
config.output.fileName = 'output.json';

// Global Web Retry Options for promise retry
// see https://github.com/IndigoUnited/node-promise-retry#readme
config.retry_options = {};
config.retry_options.retries = 3;
config.retry_options.minTimeout = 1000;
config.retry_options.maxTimeout = 2000;

/*
Polling options for retrying report availability
see https://github.com/IndigoUnited/node-promise-retry#readme
options is a JS object that can contain any of the following keys:
retries: The maximum amount of times to retry the operation.Default is 10.
Seting this to 1 means do it once, then retry it once.
factor: The exponential factor to use.Default is 2.
minTimeout: The number of milliseconds before starting the first retry.Default is 1000.
maxTimeout: The maximum number of milliseconds between two retries.Default is Infinity.
randomize: Randomizes the timeouts by multiplying with a factor between 1 to 2. Default is false.
*/

config.polling_options = {};
config.polling_options.retries = 10;
config.polling_options.minTimeout = 60 * 1000;
config.polling_options.maxTimeout = 120 * 1000;

module.exports = config;
