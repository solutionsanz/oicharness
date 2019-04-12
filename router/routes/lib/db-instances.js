/*
 * Handler for db instances. Basic wrapper around the REST API for stopping an instance.
 */

const request = require('request');

/*
 * Stop an instance via the API. Takes an instance name, and the connection details block of 
 * the config.
 * 
 * callback is of the form (err)
 */
module.exports.stopInstance = function (instanceName, connectionDetails, callback) {
  if (!instanceName || typeof instanceName != 'string' || !connectionDetails.db_rest_endpoint || !connectionDetails.idcs_id) {
    return callback(new Error("Instance name, IDCS and Rest Endpoint are required to invoke the OIC APIs!"));
  }
  var url = connectionDetails.db_rest_endpoint;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += "paas/service/dbcs/api/v1.1/instances/" + connectionDetails.idcs_id + "/" + instanceName;
  var options = {
    url: url,
    method: "POST",
    headers: {
      "X-ID-TENANT-NAME": connectionDetails.idcs_id,
      Authorization: "Basic " + Buffer.from(connectionDetails.user.username + ":" + (process.env.oic_password || connectionDetails.user.password), 'utf8').toString('base64'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "lifecycleState": "stop"
    })
  }
  request(options, function (err, req, data) {
    if (err) {
      return callback(err);
    }
    if (req.statusCode != 202) {
      return callback(new Error("Got response code " + req.statusCode + " when attempting to stop the DB instance: " + instanceName));
    }
    return callback(null);
  });
};

/*
 * Start an instance via the API. Takes an instance name, and the connection details block of 
 * the config.
 * 
 * callback is of the form (err)
 */
module.exports.startInstance = function (instanceName, connectionDetails, callback) {
  if (!instanceName || typeof instanceName != 'string' || !connectionDetails.db_rest_endpoint || !connectionDetails.idcs_id) {
    return callback(new Error("Instance name, IDCS and Rest Endpoint are required to invoke the OIC APIs!"));
  }
  var url = connectionDetails.db_rest_endpoint;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += "paas/service/dbcs/api/v1.1/instances/" + connectionDetails.idcs_id + "/" + instanceName;
  var options = {
    url: url,
    method: "POST",
    headers: {
      "X-ID-TENANT-NAME": connectionDetails.idcs_id,
      Authorization: "Basic " + Buffer.from(connectionDetails.user.username + ":" + (process.env.oic_password || connectionDetails.user.password), 'utf8').toString('base64'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "lifecycleState": "start"
    })
  }

  // console.log("****** options to be sent is [" + JSON.stringify(options) + "]");

  request(options, function (err, req, data) {
    if (err) {
      return callback(err);
    }
    if (req.statusCode != 202) {
      return callback(new Error("Got response code " + req.statusCode + " when attempting to start the DB instance: " + instanceName));
    }
    return callback(null);
  });
};