/*
 * Main handler for stopping the OPC services.
 * Consumes the config file, then creates scheduled jobs to shutdown the named instances at the defined times.
 */
const async = require('async');
const log4js = require('log4js');
var fs = require('fs');

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

var scheduler = new Scheduler();

function calculateTime(dTime) {


  //Calculate start time
  var nowTime = new Date();
  var oicHours = Math.floor(dTime / 100) - parseInt(config.schedule.timezone);
  var oicMins = dTime % 100 - ((parseFloat(config.schedule.timezone) - parseInt(config.schedule.timezone)) * 60);
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

  var startTime = new Date(0, 0, 0, 0, 0, 0, 0);
  var startOffset;
  startTime.setUTCFullYear(nowTime.getUTCFullYear());
  startTime.setUTCMonth(nowTime.getUTCMonth());
  startTime.setUTCDate(nowTime.getUTCDate());
  startTime.setUTCHours(oicHours);
  startTime.setUTCMinutes(oicMins);

  startOffset = startTime.getTime() - nowTime.getTime();
  return startOffset;
}

//CRI change:
var bodyParser = require('body-parser');

// Reading from local config variables. This will be used to configure the local Web UI app (running on a user's browser/mobile)
// Need a system property server_url set to something like: http://localhost:3000/services/oic
var data = 'localConfig = {"SERVER_URL": "' + process.env.server_url + '", "CONSOLE_URL":"' + process.env.console_url + '"};';

console.log("data is [" + data + "]");

fs.writeFile('./public/js/tempConfig.js', data, function (err, data) {
  if (err) console.log(err);
  console.log("Successfully written local config to file [public/js/tempConfig.js]");
});


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

  app.post('/services/oic/:name', ensureAuthenticated, function (req, res) {

    // Retrieving parameters:
    var name = req.params.name;
    var dbName = req.query.dbName;
    var action = req.query.action;

    if (name == null || name == undefined || action == null ||
      action == undefined || dbName == null || dbName == undefined) {

      log("POST", "/services/adw/{ocid}", "OIC parameters empty or invalid. Verify parameters and try again.");
      res.status(400).end("OIC parameters empty or invalid. Verify parameters and try again."); //Bad request...
      return;
    }


    log("POST", "/services/oic/{name}", "name received [" + name + ":" + action + "]");

    switch (action.toUpperCase()) {

      case "START":

        startOICInstances([name], [dbName]);
        break;

      case "STOP":

        shutdownOICInstances([name], [dbName]);
        break;

      default:
        log("POST", "/services/adw/{ocid}", "Invalid action. Only 'start' or 'stop' are allowed. Verify parameters and try again.");
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

  /**
   * Schedule OIC shutdown:
   */

  // Setting offset for shutting down jobs:
  var shutdownOicOffset = calculateTime(config.schedule.oic_shutdown);
  var shutdownDbOffset = calculateTime(config.schedule.db_shutdown);

  // OIC shutdown:
  // scheduler.scheduleJob(shutdownOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownOICInstancesOnly, [config.oic_instance_details.instance_names]);
  // DB shutdown
  // scheduler.scheduleJob(shutdownDbOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownDBInstancesOnly, [config.db_instance_details.instance_names]);

  // Test Schedulers:
  // scheduler.scheduleJob(shutdownOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, testScheduler, ["shutdownOicOffset", config.oic_instance_details.instance_names]);
  // scheduler.scheduleJob(shutdownDbOffset, true, config.schedule.frequency_unit, config.schedule.frequency, testScheduler, ["shutdownDbOffset", config.db_instance_details.instance_names]);

  /**
   * Schedule OIC start up:
   */

  // Setting offset for starting up jobs:
  var startOicOffset = calculateTime(config.schedule.oic_startup);
  var startDbOffset = calculateTime(config.schedule.db_startup);

  // DB startup
  // scheduler.scheduleJob(startDbOffset, true, config.schedule.frequency_unit, config.schedule.frequency, startDBInstancesOnly, [config.db_instance_details.instance_names]);
  // OIC startup
  // scheduler.scheduleJob(startOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, startOICInstancesOnly, [config.oic_instance_details.instance_names]);

  // Test Schedulers:
  // scheduler.scheduleJob(startDbOffset, true, config.schedule.frequency_unit, config.schedule.frequency, testScheduler, ["startDbOffset", config.db_instance_details.instance_names]);
  // scheduler.scheduleJob(startOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, testScheduler, ["startOicOffset", config.oic_instance_details.instance_names]);


  /**
   * Starting up functions:
   */

  function startOICInstances(arrInstances, arrDbNames) {

    /**
     * Starting DBCS first, then OIC instances.
     */
    startDBInstancesOnly(arrDbNames);

    // Setting a non-repeatable job in 30 mins.
    logger.info("Scheduling OIC start in a few minutes: ");

    whenReady(arrDbNames, "READY", startOICInstancesOnly, arrInstances); // READY/STOPPED
    //scheduler.scheduleJob(30 * 60 * 1000, false, "NA", 0, startOICInstancesOnly, arrInstances);
  }

  function startDBInstancesOnly(arrDbNames) {

    /**
     * Starting DBCS instances:
     */

    async.eachOf(arrDbNames, function (instance) {
      logger.info("Starting DBCS [" + instance + "]");
      dbInstances.startInstance(instance, config.connection_details, function (err) {
        if (err) {
          return logger.warn("Error when attempting to start instance [" + instance + "], " + err);
        }
        logger.info("Scheduled start of [" + instance + "].");

      });
    }, function () {
      logger.info("Finished DB start.");
    });
  }

  function startOICInstancesOnly(arrInstances) {

    async.eachOf(arrInstances, function (instance) {

      logger.info("Starting OIC [" + instance + "]");

      oicInstances.startInstance(instance, config.connection_details, function (err) {
        if (err) {
          return logger.warn("Error when attempting to start instance [" + instance + "], " + err);
        }

      });
    }, function () {

      logger.info("Finished OIC start.");
    });
  }

  /**
   * Shutting down functions:
   */

  function shutdownOICInstances(arrInstances, arrDbNames) {

    /**
     * Shutting down OIC first, then associated DBCS instances:
     */

    shutdownOICInstancesOnly(arrInstances);

    // Setting a non-repeatable job in 30 mins.
    logger.info("Scheduling DB to shutdown in a few minutes: ");

    whenReady(arrInstances, "STOPPED", shutdownDBInstancesOnly, arrDbNames); // READY/STOPPED
    // scheduler.scheduleJob(30 * 60 * 1000, false, "NA", 0, shutdownDBInstancesOnly, arrDbNames);

  }

  function shutdownOICInstancesOnly(arrInstances) {

    async.eachOf(arrInstances, function (instance) {

      logger.info("Shutting down OIC [" + instance + "]");

      oicInstances.stopInstance(instance, config.connection_details, function (err) {
        if (err) {
          return logger.warn("Error when attempting to shutdown instance [" + instance + "], " + err);
        }

      });
    }, function () {

      logger.info("Finished OIC shutdown.");
    });
  }

  function shutdownDBInstancesOnly(instances) {
    async.eachOf(instances, function (instance) {
      logger.info("Shutting down DBCS [" + instance + "]");
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

  function whenReady(targetInstances, targetState, job, arrInstances) {

    logger.info("Initating whenReady for [" + JSON.stringify(targetInstances) + ", [" + targetState + "]");

    oicInstances.getAllInstances(config.connection_details, function (err, instances) {
      if (err) {

        log("GET", "/services/oic", "Error while retrieving list of OIC instances. Verify parameters and try again. Error: " + err);
        res.status(500).end("Error while retrieving list of OIC instances. Verify parameters and try again. Error: " + err);
        return logger.error(err);
      }

      logger.info("Number of instances retrieved: [" + instances.length + "]");

      var numOfScores = 0;

      for (var instance of instances) {

        var i = 0;
        for (var ti of targetInstances) {

          // Validating if target instance also aligns with target state (e.g. oic/db):
          if ((instance.name == ti && instance.state == targetState) || (instance.dbName == ti && instance.dbState == targetState)) {

            logger.info("Match successful, instance [" + ti + "], found [" + targetState + "]");
            logger.info("Executing job for aligned associated instance [" + arrInstances[i] + "]");

            // Executing job for this instance:
            // For simplicity, assuming that arrays of both oic and db share the same index for related environments.
            job([arrInstances[i]]);
            ++numOfScores;
          }
          // i is used to aligned oic to db array names.
          ++i;
        }
      }

      if (numOfScores < targetInstances.length) {

        logger.info("Some instances pending, waiting for another round...");

        // Waiting for status of instance to be as desired.

        setTimeout(function () {
          whenReady(targetInstances, targetState, job, instances)
        }, 2 * 60 * 1000); //2 mins    
      }

    });
  }

  /**
   * Deprectaed functions:
   */

  /**
   * function "shutdownAllOICInstancesOnly" is meant to be called from scheduler only. It stops only all OIC instances and not
   * the associated DBs. It is supposed to be another scheduled job to then stop all DBs.
   */
  // function shutdownAllOICInstancesOnly() {

  //   oicInstances.getAllInstances(config.connection_details, function (err, instances) {
  //     if (err) {
  //       return logger.error(err);
  //     }
  //     logger.info("Got list of instances: [" + JSON.stringify(instances) + "]");
  //     async.eachOf(instances, function (instance) {

  //       logger.info("Scheduling stop of [" + instance.serviceName + ":" + instance.state + ", dbName:" + instance.dbName + "...");

  //       oicInstances.stopInstance(instance.serviceName, config.connection_details, function (err) {
  //         if (err) {
  //           return logger.warn("Error when attempting to shutdown instance [" + instance + "], " + err);
  //         }
  //         logger.info("Scheduled shutdown of [" + instance + "].");
  //       });
  //     }, function () {
  //       logger.info("Finished shutdown.");
  //     });
  //   });
  // }

  // OIC shutdown
  // if (config.oic_instance_details.stop_all_instances) {
  //   scheduler.scheduleJob(startOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownAllOICInstancesOnly, []);
  //DB shutdown
  // scheduler.scheduleJob(startDbOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownDBInstances, [config.db_instance_details.instance_names]);  
  // } else {
  //   scheduler.scheduleJob(startOicOffset, true, config.schedule.frequency_unit, config.schedule.frequency, shutdownOICInstances, [config.oic_instance_details.instance_names]);
  // }

  function testScheduler(arrValues) {

    /**
     * Starting DBCS instances:
     */

    async.eachOf(arrValues, function (instance) {
      logger.info("Running instance value [" + instance + "]");

    }, function () {
      logger.info("Finished running instances.");
    });
  }

};