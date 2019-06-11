'use strict';

const Config = require('./config');
const UserNeDB = require('./lib/usernedb');
const SessionNeDB = require('./lib/sessionnedb');
const Authentication = require('./lib/authentication');
const WebServer = require('./lib/webserver');
const Api = require('./lib/api');
const Path = require('path');

let userNeDB = new UserNeDB({ storagePath: Path.join(__dirname, Config.storageDirectory) });
let sessionNeDB = new SessionNeDB({ storagePath: Path.join(__dirname, Config.storageDirectory) });
let authentication = new Authentication(Object.assign({}, { userStore: userNeDB, sessionStore: sessionNeDB }, Config.authentication));
let api = new Api({ authentication: authentication });
let webServer = new WebServer(Object.assign({}, Config, {
  routeConfigureApp: (app) => {
    api.openRoutes(app);
    authentication.authenticationRoutes(app);
    api.secureRoutes(app);
  }
}));

webServer.createServer().configureApp().listen().then(port => { console.log('Server up on port ' + port); });
