/*
 * Main handler for stopping the OPC services.
 * Consumes the config file, then creates scheduled jobs to shutdown the named instances at the defined times.
 */
const async = require('async');
const log4js = require('log4js');

var logger = log4js.getLogger("opc-instance-handler");
logger.level = 'info';

const Scheduler = require('./lib/scheduler');
const oicInstances = require('./lib/oic-instances');
const dbInstances = require('./lib/db-instances');
const config = require('../../app_config.json');

var bodyParser = require('body-parser');

//On start, validate the config
if (!config || !config.connection_details || !config.oic_instance_details || !config.schedule) {
  throw new Error("Config object is missing required sections (connection_details, oic_instance_details, schedule are required).")
}
//Lets just assume that the rest of the config is ok

//Calculate start time
var nowTime = new Date();
var oicHours = Math.floor(config.schedule.oic_shutdown / 100) - parseInt(config.schedule.timezone);
var oicMins = config.schedule.oic_shutdown % 100 - ((parseFloat(config.schedule.timezone) - parseInt(config.schedule.timezone)) * 60);
if (oicMins < 0) {
  oicHours--;
  oicMins = oicMins * -1;
}
if (oicHours < 0) {
  oicHours += 24;
}
if (nowTime.getUTCHours() > oicHours || (nowTime.getUTCHours() == oicHours && nowTime.getUTCMinutes() > oicMins)) {
  //Need to schedule for tomorrow
  oicHours += 24;
}

var dbHours = Math.floor(config.schedule.db_shutdown / 100) - parseInt(config.schedule.timezone);
var dbMins = config.schedule.db_shutdown % 100 - ((parseFloat(config.schedule.timezone) - parseInt(config.schedule.timezone)) * 60);
if (dbMins < 0) {
  dbHours--;
  dbMins = dbMins * -1;
}
if (dbHours < 0) {
  dbHours += 24;
}
if (nowTime.getUTCHours() > dbHours || (nowTime.getUTCHours() == dbHours && nowTime.getUTCMinutes() > dbMins)) {
  //Need to schedule for tomorrow
  dbHours += 24;
}

var startTime = new Date(0, 0, 0, 0, 0, 0, 0);
startTime.setUTCFullYear(nowTime.getUTCFullYear());
startTime.setUTCMonth(nowTime.getUTCMonth());
startTime.setUTCDate(nowTime.getUTCDate());
startTime.setUTCHours(oicHours);
startTime.setUTCMinutes(oicMins);
var startOicOffset = startTime.getTime() - nowTime.getTime();
startTime.setUTCHours(dbHours);
startTime.setUTCMinutes(dbMins);
var startDbOffset = startTime.getTime() - nowTime.getTime();

var scheduler = new Scheduler();




//CRI change:
var bodyParser = require('body-parser');

// Configure application routes
module.exports = function (app, ensureAuthenticated) {

  // CRI change to allow JSON parsing from requests:    
  app.use(bodyParser.json()); // Support for json encoded bodies 
  app.use(bodyParser.urlencoded({
    extended: true
  })); // Support for encoded bodies

  function log(apiMethod, apiUri, msg) {
    logger.info("[" + apiMethod + "], [" + apiUri + "], [" + msg + "], [UTC:" +
      new Date().toISOString().replace(/\..+/, '') + "]");
  }

  /**
   * Adding APIs:
   * 
   */

  app.get('/services/oic', ensureAuthenticated, function (req, res) {


    oicInstances.getAllInstances(config.connection_details, function (err, instances) {
      if (err) {

        log("GET", "/services/oic", "Error while retrieving list of OIC instances. Verify parameters and try again. Error: " + err);
        res.status(500).end("Error while retrieving list of OIC instances. Verify parameters and try again. Error: " + err);
        return logger.error(err);

      }
      logger.info("Number of instances retrieved: [" + instances.length + "]");

      // Returning result
      res.send({
        "services": instances
      });
    });

  });

  app.get('/services/oic/:name', ensureAuthenticated, function (req, res) {

    // Retrieving parameters:
    var name = req.params.name;
    var dbName = req.query.dbName;
    var action = req.query.action;

    if (name == null || name == undefined || action == null ||
      action == undefined || dbName == null || dbName == undefined) {

      log("PUT", "/services/adw/{ocid}", "OIC parameters empty or invalid. Verify parameters and try again.");
      res.status(400).end("OIC parameters empty or invalid. Verify parameters and try again."); //Bad request...
      return;
    }


    log("PUT", "/services/oic/{name}", "name received [" + name + ":" + action + "]");

    switch (action.toUpperCase()) {

      case "START":

        log("PUT", "/services/adw/{ocid}", "Invalid action. Only 'start' or 'stop' are allowed. Verify parameters and try again.");
        res.status(400).end("Invalid action. Only 'start' or 'stop' are allowed. Verify parameters and try again."); //Bad request...
        return;
        break;

      case "STOP":

        shutdownOICInstances([name], [dbName]);
        break;

      default:
        log("PUT", "/services/adw/{ocid}", "Invalid action. Only 'start' or 'stop' are allowed. Verify parameters and try again.");
        res.status(400).end("Invalid action. Only 'start' or 'stop' are allowed. Verify parameters and try again."); //Bad request...
        return;
    }

    // Returning result
    res.send({
      "id": "202",
      "status": "accepted",
      "message": "Request accepted... Work in progress."
    });

  });


  //Schedule OIC shutdown
  // if (config.oic_instance_details.stop_all_instances) {
  //   scheduler.scheduleJob(startOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownAllOICInstances, []);
  // } else {
  //   scheduler.scheduleJob(startOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownOICInstances, [config.oic_instance_details.instance_names]);
  // }

  //DB shutdown
  // scheduler.scheduleJob(startDbOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownDBInstances, [config.db_instance_details.instance_names]);

  /**
   * function "shutdownAllOICInstancesOnly" is meant to be called from scheduler only. It stops only all OIC instances and not
   * the associated DBs. It is supposed to be another scheduled job to then stop all DBs.
   */
  function shutdownAllOICInstancesOnly() {

    oicInstances.getAllInstances(config.connection_details, function (err, instances) {
      if (err) {
        return logger.error(err);
      }
      logger.info("Got list of instances: [" + JSON.stringify(instances) + "]");
      async.eachOf(instances, function (instance) {

        logger.info("Scheduling stop of [" + instance.serviceName + ":" + instance.state + ", dbName:" + instance.dbName + "...");

        oicInstances.stopInstance(instance.serviceName, config.connection_details, function (err) {
          if (err) {
            return logger.warn("Error when attempting to shutdown instance [" + instance + "], " + err);
          }
          logger.info("Scheduled shutdown of [" + instance + "].");
        });
      }, function () {
        logger.info("Finished shutdown.");
      });
    });
  }

  function shutdownOICInstances(arrInstances, arrDbName) {

    async.eachOf(arrInstances, function (instance) {
      logger.info("Scheduling stop of " + instance + "...");
      oicInstances.stopInstance(instance, config.connection_details, function (err) {
        if (err) {
          return logger.warn("Error when attempting to shutdown instance [" + instance + "], " + err);
        }
        logger.info("Scheduled shutdown of [" + instance + "].");
      });
    }, function () {

      logger.info("Finished OIC shutdown. Scheduling DB shutdown in 30 minutes from now: ");

      // Setting a non-repeatable job in 30 mins.
      scheduler.scheduleJob(startDbOffset, false, "MINUTES", 1, shutdownDBInstances, arrDbName);
    });
  }

  function shutdownDBInstances(instances) {
    async.eachOf(instances, function (instance) {
      logger.info("Scheduling stop of " + instance + "...");
      dbInstances.stopInstance(instance, config.connection_details, function (err) {
        if (err) {
          return logger.warn("Error when attempting to shutdown instance [" + instance + "], " + err);
        }
        logger.info("Scheduled shutdown of [" + instance + "].");
      });
    }, function () {
      logger.info("Finished DB shutdown.");
    });
  }

};