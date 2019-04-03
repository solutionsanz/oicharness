/*
 * Handler for oic instances. Basic wrapper around the REST APIs for getting instance information,
 * as well as starting and stopping them.
 */

const request = require('request');
const config = require('../../../app_config.json');

/*
 * Gets a list of all instances in the environment. Takes the connection details block of the
 * config, which includes the rest endpoint, then idcs-id and user details for the connection.
 * 
 * callback is of the form (err, instances)
 */
module.exports.getAllInstances = function (connectionDetails, callback) {
  if (!connectionDetails.oic_rest_endpoint || !connectionDetails.idcs_id) {
    return callback(new Error("IDCS and Rest Endpoint are required to invoke the OIC APIs!"));
  }
  var url = connectionDetails.oic_rest_endpoint;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += "paas/api/v1.1/instancemgmt/" + connectionDetails.idcs_id + "/services/IntegrationCloud/instances";


  var options = {
    url: url,
    method: "GET",
    headers: {
      "X-ID-TENANT-NAME": connectionDetails.idcs_id,
      Authorization: "Basic " + Buffer.from(connectionDetails.user.username + ":" + (process.env.oic_password || connectionDetails.user.password), 'utf8').toString('base64')
    }
  }
  request(options, function (err, req, data) {
    if (err) {
      return callback(err);
    }
    if (req.statusCode != 200) {
      return callback(new Error("Got response code " + req.statusCode + " when attempting to get all OIC instances."));
    }
    //We are just going to return the service name
    var services = [];
    var resBody = {};
    var serviceName, serviceStatus, x = 0;
    try {

      var dataJSON = JSON.parse(data);

      //console.log("dataJSON is [" + JSON.stringify(dataJSON) + "]");


      for (var instance in dataJSON.services) {

        resBody = {

          "name" : instance,
          "state" : dataJSON.services[instance].state,
          "dbName" : dataJSON.services[instance].allAssociations.toAssociations[0].displayName === "DbaaS association" ? dataJSON.services[instance].allAssociations.toAssociations[0].destServiceName : "Error"
        };

        services.push(resBody);
      }
    } catch (ex) {
      return callback(ex);
    }

    return callback(null, services);
  });
};

/*
 * Stop an instance via the API. Takes an instance name, and the connection details block of 
 * the config.
 * 
 * callback is of the form (err)
 */
module.exports.stopInstance = function (instanceName, connectionDetails, callback) {
  if (!instanceName || typeof instanceName != 'string' || !connectionDetails.oic_rest_endpoint || !connectionDetails.idcs_id) {
    return callback(new Error("Instance name, IDCS and Rest Endpoint are required to invoke the OIC APIs!"));
  }
  var url = connectionDetails.oic_rest_endpoint;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += "paas/api/v1.1/instancemgmt/" + connectionDetails.idcs_id + "/services/IntegrationCloud/instances/";
  url += instanceName + "/hosts/stop";
  var options = {
    url: url,
    method: "POST",
    headers: {
      "X-ID-TENANT-NAME": connectionDetails.idcs_id,
      Authorization: "Basic " + Buffer.from(connectionDetails.user.username + ":" + (process.env.oic_password || connectionDetails.user.password), 'utf8').toString('base64'),
      "Content-Type": "application/vnd.com.oracle.oracloud.provisioning.Service+json"
    },
    body: JSON.stringify({
      "allServiceHosts": true
    })
  }
  request(options, function (err, req, data) {
    if (err) {
      return callback(err);
    }
    if (req.statusCode != 202) {
      return callback(new Error("Got response code " + req.statusCode + " when attempting to stop the OIC instance: " + instanceName));
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
  if (!instanceName || typeof instanceName != 'string' || !connectionDetails.oic_rest_endpoint || !connectionDetails.idcs_id) {
    return callback(new Error("Instance name, IDCS and Rest Endpoint are required to invoke the OIC APIs!"));
  }
  var url = connectionDetails.oic_rest_endpoint;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += "paas/api/v1.1/instancemgmt/" + connectionDetails.idcs_id + "/services/IntegrationCloud/instances/";
  url += instanceName + "/hosts/start";
  var options = {
    url: url,
    method: "POST",
    headers: {
      "X-ID-TENANT-NAME": connectionDetails.idcs_id,
      Authorization: "Basic " + Buffer.from(connectionDetails.user.username + ":" + (process.env.oic_password || connectionDetails.user.password), 'utf8').toString('base64'),
      "Content-Type": "application/vnd.com.oracle.oracloud.provisioning.Service+json"
    },
    body: JSON.stringify({
      "allServiceHosts": true
    })
  }
  request(options, function (err, req, data) {
    if (err) {
      return callback(err);
    }
    if (req.statusCode != 202) {
      return callback(new Error("Got response code " + req.statusCode + " when attempting to start the OIC instance: " + instanceName));
    }
    return callback(null);
  });
};