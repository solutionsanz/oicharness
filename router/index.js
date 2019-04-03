module.exports = function(app, ensureAuthenticated) {  
  // here we list our individual sets of routes to use
  require('./routes/OIC_services')(app, ensureAuthenticated);
};