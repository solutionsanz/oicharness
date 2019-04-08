const express = require('express');
const path = require('path');
const request = require('request');
const cookieParser = require('cookie-parser');
const jwa = require('jwa');
const rsassa = jwa('RS256');

const TOKEN_CLAIMS_COOKIE = "IDCS_CLAIMS";
//One hour in milliseconds
const ONE_HOUR = 3600000;

const config = require('./sso_config.json');


var app = express();
app.use(cookieParser());

//Middleware to redirect to login
function ensureAuthenticated(req, res, next) {
  if (_validateToken(req)) {
    return next();
  }
  //denied. redirect to login
  //Could generate redirect url dynamically... but lazy
  res.redirect(config.idcs_uri + config.urls.auth + "?client_id=" +config.login_client.id 
  +"&redirect_uri=" + config.redirect_uri + "&response_type=code&scope=urn:opc:idm:__myscopes__");
}

//Expose our demo UI
app.use('/demo', ensureAuthenticated, express.static(path.join(__dirname, 'public')));

//Handler for 3-legged callback
app.get('/callback', function(req, res){
  //grab the code from the response
  var code = req.query.code;
  if(!code){
    //Uh oh
    return res.status(401).send("Access Denied");
  }
  //Get the token from IDCS
  var options = {
    method: "POST",
    url: config.idcs_uri + config.urls.token,
    headers: {
      "Authorization": "Basic " + Buffer.from(config.login_client.id + ":" + config.login_client.secret).toString('base64'),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=authorization_code&code=" +code
  };
  request(options, function(err, response, body){
    if(err){
      console.error(err);
      return res.status(500).send("Something went wrong getting the tokens from IDCS");
    }
    if(response.statusCode != 200){
      console.error("Got a status of " +response.statusCode +" from IDCS...")
      console.error(body);
      return res.status(500).send("Something went wrong getting the tokens from IDCS");
    }
    //We should have an access token and a refresh token in our response body
    try{
      var bodyJSON = JSON.parse(body);
      //return the access token in a cookie
      res.cookie(TOKEN_CLAIMS_COOKIE, bodyJSON.access_token, {httpOnly:true, expires:new Date(Date.now() + ONE_HOUR)}).redirect("/demo");
    }catch(ex){
      return res.status(500).send("Something went wrong getting the tokens from IDCS - in parsing...");
    }
    
  });
});

app.get("/test-api", function(req, res){
  
});

app.listen(3000, function () {
  console.log('Refresh token demo app listening on port 3000!');
});

// Configure routes and middleware for the application
require('./router')(app, ensureAuthenticated);

function _validateToken(req) {
  console.log("Validating token...");
  //Extract the cookie
  var authCookie = req.cookies[TOKEN_CLAIMS_COOKIE];
  if (!authCookie) {
    console.log("No cookie with token in it!");
    return false;
  }
  authCookie = authCookie.split('.');
  //Validate first
  if (!rsassa.verify(authCookie[0] + "." + authCookie[1], authCookie[2], config.token_public_key)) {
    console.log("Token was invalid!");
    return false;
  }
  //Verify expiry
  var payload;
  try {
    payload = JSON.parse(Buffer.from(authCookie[1], 'base64').toString());
  } catch (err) {
    return false;
  }
  if (!payload.exp || new Date(payload.exp*1000).getTime() < Date.now()) {
    console.log("Token expired!");
    return false;
  }
  return true;
}

//Uses the client credentials scope to get a token that can manage the refresh tokens
function _getBearerToken(callback) {
  var options = {
    method: "POST",
    url: config.idcs_uri + config.urls.token,
    headers: {
      "Authorization": "Basic " + Buffer.from(config.admin_client.id + ":" + config.admin_client.secret).toString('base64'),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials&scope=urn:opc:idm:__myscopes__"
  };
  request(options, function (err, res, body) {
    if (err) {
      callback(err);
      return;
    }
    //console.log("In bearer callback: " +body);
    var bodyJson = JSON.parse(body);
    var bearer = bodyJson["access_token"];
    if (bearer) {
      callback(null, bearer);
    } else {
      callback(new Error("Could not obtain Bearer token from IDCS!"));
    }
  });
}