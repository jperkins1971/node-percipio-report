var customer = process.env.CUSTOMER || 'default';

var configFile = 'config.' + customer;
var configPath = './' + configFile;

//

logmessage = (message, label, level) => {
    var info = {};
    info.timestamp = new Date().toISOString();
    info.message = message;
    info.label = label;
    info.level = level;

    console.log(`${info.timestamp} [${info.label}] ${info.level}: ${info.message}`);
}

logmessage( 'Loading Configuration', 'config', 'info');
logmessage( `Loading Config Overrides from ./config/${configFile}`, 'config', 'info');
cfg = require(configPath);
logmessage( 'Loading Configuration Completed', 'config', 'info');
module.exports = cfg;