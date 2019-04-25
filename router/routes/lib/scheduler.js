/*
 * Basic lightweight scheduler - simply holding the scheduled jobs in memory 
 * then using setTimeout to handle them.
 * Not backed by anything, and it is assumed that all of the jobs will be pushed in on start.
 */

const uuid = require('./uuid');

const _unitMillseconds = {
    SECONDS: 1000,
    MINUTES: 60000,
    HOURS: 3600000,
    DAYS: 86400000
};

//Constructor - creating this as a class to store jobs, 
//so they can be removed at some point if that functionality is required
function Scheduler() {
    this.jobs = {};
}

/*
 * Add a new job
 * Params:
 *  - startTimeOffset - milliseconds from now at which this should first run
 *  - repeats - boolean which dictates if this should run at some interval
 *  - repeatUnit - one of 'SECONDS', MINUTES', 'HOURS', 'DAYS' - the unit at which this should repeat
 *  - repeatNumUnits - schedules the repeat to run every n repeat units, i.e. setting this to 5
 *                     when repeatUnit is 'MINUTES" causes the job to run every 5 minutes
 *  - job - function which is invoked by the scheulder
 *  - jobArgs - array of arguments passed to the job function
 * 
 * Returns the jobId
 * 
 * Jobs do not have a callback...
 */
Scheduler.prototype.scheduleJob = function (startTimeOffset, repeats, repeatUnit, repeatNumUnits, job, jobArgs) {
  var self = this;
  var jobId = uuid.generateUUID();
  if(!jobArgs){
    jobArgs = [];
  }
  if(!Array.isArray(jobArgs)){
    jobArgs = [jobArgs];
  }
  this.jobs[jobId] = {};
  this.jobs[jobId].timeoutId = setTimeout(function(){
    //job(...jobArgs);
    job(jobArgs);
    if(repeats){
        // this.jobs[jobId].intervalId = setInterval(job, repeatNumUnits*_unitMillseconds[repeatUnit], ...jobArgs);
        this.jobs[jobId].intervalId = setInterval(job, repeatNumUnits*_unitMillseconds[repeatUnit], jobArgs);
    }
  }.bind(self), startTimeOffset);
  return jobId;
}

/*
 * Clears a previously created job
 */
Scheduler.prototype.clearJob = function(jobId){
  if(this.jobs[jobId]){
    if(this.jobs[jobId].intervalId){
      return clearInterval(this.jobs[jobId].intervalId);
    }else{
      return clearTimeout(this.jobs[jobId].timeoutId);
    }
  }
}

module.exports = Scheduler;