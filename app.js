const axios = require('axios');
const fs = require('fs');
const Path = require('path');
const _ = require('lodash');
const promiseRetry = require('promise-retry');
const globalTunnel = require('global-tunnel-ng');
const pkginfo = require('pkginfo')(module);

const { transports } = require('winston');

var logger = require('./lib/logger');
var myutil = require('./lib/util');

var configOptions = require('./config');

//Percipio Report API calls
const submitReport = async (options) => promiseRetry(async (retry, numberOfRetries) => {
    var requestBody = options.report.request || {};

    var requestDefaults = {
        "sftpId" : null,
        "fileMask" : null,
        "folderName": null,
        "formatType": "JSON"
    };

    // merge opt with default config
    _.defaults(requestBody, requestDefaults);

    // Remove any nulls
    requestBody = _.omitBy(requestBody, _.isNil);
    logger.debug( `Request Details: ${JSON.stringify(requestBody)}`, { label: 'submitReport'});

    requestUri = `${options.site.baseuri}/reporting/v1/organizations/${options.site.orgid}/report-requests/${options.report.type}`;

    logger.debug( `Request URI: ${requestUri}`, { label: 'submitReport'});

    const axiosConfig = {
        url: requestUri,
        headers: {
            Authorization: `Bearer ${options.site.bearer}`
        },
        method: 'POST',
        data: requestBody
    };

    logger.debug( `Axios Config: ${JSON.stringify(axiosConfig)}`, { label: 'submitReport'});


    try {
        const response = await axios.request(axiosConfig);
        logger.debug( `Response Headers: ${JSON.stringify(response.headers)}`, { label: 'submitReport'});
        return response.data;
    } catch (err) {
        logger.warn( `ERROR: Trying to get report. Got Error after Attempt# ${numberOfRetries} : ${err}`, { label: 'submitReport'});
        if (numberOfRetries < options.retry_options.retries + 1) {
            retry(err);
        } else {
            logger.fatal( 'ERROR: DONE Trying to get report', { label: 'submitReport'});
        }
        throw err;
    }

}, configOptions.retry_options);

const getReport = async (options, reportid) => promiseRetry(async (retry, numberOfRetries) => {
    requestUri = `${options.site.baseuri}/reporting/v1/organizations/${options.site.orgid}/report-requests/${reportid}`;

    logger.debug(`Request URI: ${requestUri}`, { label: 'getReport'});

    const axiosConfig = {
        url: requestUri,
        headers: {
            Authorization: `Bearer ${options.site.bearer}`
        },
        method: 'GET'
    };

    logger.debug(`Axios Config: ${JSON.stringify(axiosConfig)}`, { label: 'getReport'});


    try {
        const response = await axios.request(axiosConfig);
        logger.debug( `Response Headers: ${JSON.stringify(response.headers)}`, { label: 'getReport'});
        if (_.isUndefined(response.data.status)) {
            return response.data;
        } else {
            throw new Error(`Report ${response.data.reportId} status is ${response.data.status}`);
        }
    } catch (err) {
        logger.warn( `ERROR: Trying to get report. Got Error after Attempt# ${numberOfRetries} : ${err}`, { label: 'getReport'});
        if (numberOfRetries < options.polling_options.retries + 1) {
            retry(err);
        } else {
            logger.fatal( 'ERROR: DONE Trying to get report', { label: 'getReport'});
        }
        throw err;
    }

}, configOptions.polling_options);


const main = async (options) => {

    //Create logging folder if one does not exist
    if (!_.isNull(options.debug.logpath)) {
        if (!fs.existsSync(options.debug.logpath)) {
            myutil.makeFolder(options.debug.logpath);
        }
    }

    logger.info(`Start ${module.exports.name}`, { label: 'main'});

    logger.level = options.debug.loggingLevel;

    //Add log file for none dev, and set logging to silly level for dev
    if (NODE_ENV != 'development') {
        logger.add(new transports.File({ filename:  Path.join(options.debug.logpath, options.debug.logFile), options: { flags: 'w' } }));
    } else {
        logger.level = 'silly';
    }

    logger.debug(`Options: ${JSON.stringify(options)}`, { label: 'main'});

    options = options || null;

    //For PRODUCTION you would want to remove this
    if (options.debug.checkFiddler) {
        logger.info('Checking if Fiddler is running', { label: 'main'});
        var result = await myutil.isFiddlerRunning(options.debug.fiddlerAddress, options.debug.fiddlerPort);
        if (result) {
            logger.info('Setting Proxy Configuration so requests are sent via Fiddler', { label: 'main'});

            process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

            globalTunnel.initialize({
                host: options.debug.fiddlerAddress,
                port: options.debug.fiddlerPort
            });
        }
    } else {
        //Use the process.env.http_proxy and https_proxy
        globalTunnel.initialize();
    }


    if (_.isNull(options)) {
        logger.error('Invalid configuration make sure to set env CUSTOMER', { label: 'main'});
        return false;
    }

    if (_.isNull(options.site.orgid)) {
        logger.error('Invalid configuration - no orgid in config file or set env CUSTOMER_ORGID', { label: 'main'});
        return false;
    }

    if (_.isNull(options.site.bearer)) {
        logger.error('Invalid configuration - no bearer or set env CUSTOMER_BEARER', { label: 'main'});
        return false;
    }

    //Create output folder if one does not exist
    if (!_.isNull(options.output.path)) {
        if (!fs.existsSync(options.output.path)) {
            myutil.makeFolder(options.output.path);
            logger.info(`Created output directory ${options.output.path}`, { label: 'main'});
        }
    }
    
    logger.info('Report Request Submitted', { label: 'main'});
    source = await submitReport(options);
    logger.info(`Report Id: ${source.id}`, { label: 'main'});
    logger.debug(`Response: ${JSON.stringify(source)}`, { label: 'main'});

    logger.info('Report Poll Submitted', { label: 'main'});
    response = await getReport(options, source.id);
    logger.info(`Report Retrieved. Records: ${response.length}`, { label: 'main'});
    logger.debug(`Response: ${JSON.stringify(response)}`, { label: 'main'});

    var outputFilename = options.output.fileName;

    if (!_.isNull(options.output.path)) {
        outputFilename = Path.join(options.output.path, outputFilename);
    }

    if (fs.existsSync(outputFilename)) {
        fs.unlinkSync(outputFilename);
        logger.debug(`Deleted old data. Filename: ${outputFilename}`, { label: 'main'});
    }

    fs.writeFileSync(outputFilename, JSON.stringify(response));
    logger.info(`JSON written to ${outputFilename}`, { label: 'main'});

};


var NODE_ENV = process.env.NODE_ENV || 'development';
main(configOptions);
