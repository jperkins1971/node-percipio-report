var config = require('./config.global');

config.customer = 'learningActivity';

//Debug logging
//One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
//config.debug.loggingLevel = 'debug';
//Check for fiddler
config.debug.checkFiddler = false;
//Fiddler IP address
config.debug.fiddlerAddress = '127.0.0.1';
//Fiddler Port
config.debug.fiddlerPort = '8888';
//Debug logging
//One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
config.debug.loggingLevel = 'debug';
config.debug.logpath = 'results/output';
config.debug.logFile = `app.log`;


//Site
config.site.orgid = process.env.CUSTOMER_ORGID || null;
config.site.bearer = process.env.CUSTOMER_BEARER || null;

//Output
//Path to save data
config.output.path = 'results/output';
//File name for the data
config.output.fileName = 'learningActivity.json';

//Default Report Request Parameters to /reporting end point
//Always create new object to override defaults, set any parameters to NULL that are not wanted
config.report = {};
//This is the report type
config.report.type = 'learning-activity'
config.report.request = {};

//Parse from JSON
var reportRequest = '{ "timeframe" : "DAY", "sort" : { "field" : "firstAccessDate", "order" : "desc"} }';
config.report.request = JSON.parse(reportRequest);

//Set individually
/* config.report.request.start = null;
config.report.request.end =  null;
config.report.request.timeframe = null;
config.report.request.audience = null;
config.report.request.locale = null;
config.report.request.contentType = null;
config.report.request.sort = {};
config.report.request.sort.field = 'lastAccessDate';
config.report.request.sort.order = 'desc';
config.report.request.status = null; */

//Polling options for retrying report availability
//see https://github.com/IndigoUnited/node-promise-retry#readme
//options is a JS object that can contain any of the following keys:
//retries: The maximum amount of times to retry the operation.Default is 10. Seting this to 1 means do it once, then retry it once.
//factor: The exponential factor to use.Default is 2.
//minTimeout: The number of milliseconds before starting the first retry.Default is 1000.
//maxTimeout: The maximum number of milliseconds between two retries.Default is Infinity.
//randomize: Randomizes the timeouts by multiplying with a factor between 1 to 2. Default is false.

//config.polling_options = {};
//config.polling_options.retries = 10;
//config.polling_options.minTimeout = 60 * 1000;
//config.polling_options.maxTimeout = 120 * 1000;



module.exports = config;