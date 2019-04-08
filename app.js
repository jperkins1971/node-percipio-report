/*
eslint linebreak-style: ["error", "windows"]
*/

const axios = require('axios');
const fs = require('fs');
const Path = require('path');
const _ = require('lodash');
const promiseRetry = require('promise-retry');
const globalTunnel = require('global-tunnel-ng');
// eslint-disable-next-line no-unused-vars
const pkginfo = require('pkginfo')(module);

const { transports } = require('winston');
const logger = require('./lib/logger');
const myutil = require('./lib/util');
const configuration = require('./config');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Submit the report request
 *
 * @param {*} options
 * @returns
 */
const submitReport = async options => {
  return promiseRetry(async (retry, numberOfRetries) => {
    const loggingOptions = {
      label: 'submitReport'
    };

    let requestBody = options.report.request || {};

    // Remove any nulls
    requestBody = _.omitBy(requestBody, _.isNil);
    logger.debug(`Request Details: ${JSON.stringify(requestBody)}`, loggingOptions);

    if (!_.isUndefined(requestBody.timeframe)) {
      // Log the timeframe info
      logger.info(
        `Utilising timeframe: ${requestBody.timeframe} Calculated Start: ${myutil.getStartDate(
          requestBody.timeframe
        )} Calculated End: ${myutil.getEndDate(requestBody.timeframe)}`,
        loggingOptions
      );
    }

    const requestUri = `${options.site.baseuri}/reporting/v1/organizations/${
      options.site.orgid
    }/report-requests/${options.report.type}`;

    logger.debug(`Request URI: ${requestUri}`, loggingOptions);

    const axiosConfig = {
      url: requestUri,
      headers: {
        Authorization: `Bearer ${options.site.bearer}`
      },
      method: 'POST',
      data: requestBody
    };

    logger.debug(`Axios Config: ${JSON.stringify(axiosConfig)}`, loggingOptions);

    try {
      const response = await axios.request(axiosConfig);
      logger.debug(`Response Headers: ${JSON.stringify(response.headers)}`, loggingOptions);
      logger.debug(`Response Body: ${JSON.stringify(response.data)}`, loggingOptions);

      if (!_.isUndefined(response.data.status) && response.data.status !== 'FAILED') {
        return response.data;
      }

      const error = new Error(`Report ${response.data.id} status is ${response.data.status}`);
      error.response = response;
      throw error;
    } catch (err) {
      logger.warn(
        `Trying to get report. Got Error after Attempt# ${numberOfRetries} : ${err}`,
        loggingOptions
      );
      if (err.response) {
        logger.debug(`Response Headers: ${JSON.stringify(err.response.headers)}`, loggingOptions);
        logger.debug(`Response Body: ${JSON.stringify(err.response.data)}`, loggingOptions);
      } else {
        logger.debug('No Response Object available', loggingOptions);
      }
      if (numberOfRetries < options.retry_options.retries + 1) {
        retry(err);
      } else {
        logger.error('Failed to request report', loggingOptions);
      }
      throw err;
    }
  }, options.retry_options);
};

/**
 * Poll for the sepcified reportid, the polling uses the promisRetry
 * confguration defined in config.polling_options
 *
 * @param {*} options
 * @param {*} reportid
 * @returns
 */
const pollForReport = async (options, reportid) => {
  return promiseRetry(async (retry, numberOfRetries) => {
    const loggingOptions = {
      label: 'pollForReport'
    };

    const requestUri = `${options.site.baseuri}/reporting/v1/organizations/${
      options.site.orgid
    }/report-requests/${reportid}`;

    logger.debug(`Request URI: ${requestUri}`, loggingOptions);

    const axiosConfig = {
      url: requestUri,
      headers: {
        Authorization: `Bearer ${options.site.bearer}`
      },
      method: 'GET'
    };

    logger.debug(`Axios Config: ${JSON.stringify(axiosConfig)}`, loggingOptions);

    try {
      const response = await axios.request(axiosConfig);
      logger.debug(`Response Headers: ${JSON.stringify(response.headers)}`, loggingOptions);
      logger.debug(`Response Body: ${JSON.stringify(response.data)}`, loggingOptions);

      if (_.isUndefined(response.data.status)) {
        return response.data;
      }
      const error = new Error(`Report ${response.data.reportId} status is ${response.data.status}`);
      error.response = response;
      throw error;
    } catch (err) {
      logger.warn(
        `Trying to get report. Got Error after Attempt# ${numberOfRetries} : ${err}`,
        loggingOptions
      );
      if (err.response) {
        logger.debug(`Response Headers: ${JSON.stringify(err.response.headers)}`, loggingOptions);
        logger.debug(`Response Body: ${JSON.stringify(err.response.data)}`, loggingOptions);
      } else {
        logger.debug('No Response Object available', loggingOptions);
      }
      if (numberOfRetries < options.polling_options.retries + 1) {
        retry(err);
      } else {
        logger.error('Failed to retrieve report', loggingOptions);
      }
      throw err;
    }
  }, options.polling_options);
};

/**
 * Process the report submit, polling and save the results
 *
 * @param {*} options
 * @returns
 */
const main = async configOptions => {
  const loggingOptions = {
    label: 'main'
  };

  const options = configOptions || null;

  if (_.isNull(options)) {
    logger.error('Invalid configuration', loggingOptions);
    return false;
  }

  // Set logging to silly level for dev
  if (NODE_ENV.toUpperCase() === 'DEVELOPMENT') {
    logger.level = 'silly';
  } else {
    logger.level = options.debug.loggingLevel;
  }

  // Create logging folder if one does not exist
  if (!_.isNull(options.debug.logpath)) {
    if (!fs.existsSync(options.debug.logpath)) {
      myutil.makeFolder(options.debug.logpath);
    }
  }

  // Add logging to a file
  logger.add(
    new transports.File({
      filename: Path.join(options.debug.logpath, options.debug.logFile),
      options: {
        flags: 'w'
      }
    })
  );

  logger.info(`Start ${module.exports.name}`, loggingOptions);

  logger.debug(`Options: ${JSON.stringify(options)}`, loggingOptions);

  if (options.debug.checkFiddler) {
    logger.info('Checking if Fiddler is running', loggingOptions);

    const result = await myutil.isFiddlerRunning(
      options.debug.fiddlerAddress,
      options.debug.fiddlerPort
    );

    if (result) {
      logger.info('Setting Proxy Configuration so requests are sent via Fiddler', loggingOptions);

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

      globalTunnel.initialize({
        host: options.debug.fiddlerAddress,
        port: options.debug.fiddlerPort
      });
    }
  } else {
    // Use the process.env.http_proxy and https_proxy
    globalTunnel.initialize();
  }

  if (_.isNull(options.site.orgid)) {
    logger.error(
      'Invalid configuration - no orgid in config file or set env CUSTOMER_ORGID',
      loggingOptions
    );
    return false;
  }

  if (_.isNull(options.site.bearer)) {
    logger.error('Invalid configuration - no bearer or set env CUSTOMER_BEARER', loggingOptions);
    return false;
  }

  // Create output folder if one does not exist
  if (!_.isNull(options.output.path)) {
    if (!fs.existsSync(options.output.path)) {
      myutil.makeFolder(options.output.path);
      logger.info(`Created output directory ${options.output.path}`, loggingOptions);
    }
  }

  submitReport(options)
    .then(submitResponse => {
      logger.info(`Report Id: ${submitResponse.id}`, loggingOptions);
      logger.info('Report Poll Submitted', loggingOptions);

      pollForReport(options, submitResponse.id)
        .then(response => {
          let outputFilename = options.output.fileName;

          if (
            _.isUndefined(options.report.request.formatType) ||
            options.report.request.formatType === 'JSON'
          ) {
            logger.info(`Report Retrieved. Records: ${response.length}`, loggingOptions);
            logger.debug(`Response: ${JSON.stringify(response)}`, loggingOptions);

            if (!_.isNull(options.output.path)) {
              outputFilename = Path.join(options.output.path, outputFilename);
            }

            if (fs.existsSync(outputFilename)) {
              fs.unlinkSync(outputFilename);
              logger.debug(`Deleted old data. Filename: ${outputFilename}`, loggingOptions);
            }

            fs.writeFileSync(outputFilename, JSON.stringify(response));
            logger.info(`JSON written to ${outputFilename}`, loggingOptions);
          } else {
            logger.info('Report Retrieved.', loggingOptions);
            logger.debug(`Response: ${response}`, loggingOptions);

            if (!_.isNull(options.output.path)) {
              outputFilename = Path.join(options.output.path, outputFilename);
            }

            if (fs.existsSync(outputFilename)) {
              fs.unlinkSync(outputFilename);
              logger.debug(`Deleted old data. Filename: ${outputFilename}`, loggingOptions);
            }

            fs.writeFileSync(outputFilename, response);
            logger.info(`Response written to ${outputFilename}`, loggingOptions);
          }
        })
        .catch(err => {
          logger.error(`Error:  ${err}`, loggingOptions);
        });
    })
    .catch(err => {
      logger.error(`Error:  ${err}`, loggingOptions);
    });
  return true;
};

main(configuration);
