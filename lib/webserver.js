'use strict';

const Path = require('path');
const FS = require('fs');
const HTTP = require('http');
const HTTPS = require('https');
const Express = require('express');
const FavIcon = require('serve-favicon');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');

const Defaults = {
  httpPort: 80,
  httpsPort: 443,
  address: null,
  webDirectory: 'public',
  faviconFile: 'favicon.ico',
  preConfigureApp: (app) => { },
  routeConfigureApp: (app) => { },
  postConfigureApp: (app) => { },
  keyFile: null,
  crtFile: null
};

class WebServer {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
  }

  // create the HTTP(S) server using the provided app or new Express app
  createServer (app) {
    this.app = app || Express();
    let server = this.createHTTPSServer(this.app);
    this.server = server || this.createHTTPServer(this.app);
    return this;
  }

  // create an HTTP server with the provided app
  createHTTPServer (app) {
    this.httpServer = HTTP.createServer(app);
    return this.httpServer;
  }

  // create https server if certificate files exist
  createHTTPSServer (app) {
    let sslKey, sslCert;
    try {
      sslKey  = FS.readFileSync(this.Config.keyFile, 'utf8');
      sslCert = FS.readFileSync(this.Config.crtFile, 'utf8');
    }
    catch (error) {
      console.log('Error, no SSL/TLS certificate files.');
      return null;
    }
    try {
      this.httpsServer = HTTPS.createServer({ key: sslKey, cert: sslCert }, app);
    }
    catch (error) {
      console.log('Error creating https server.', error.message);
      return null;
    }
    this.createRedirectServer();
    return this.httpsServer;
  }

  // create an HTTP server that redirects to HTTPS server
  createRedirectServer () {
    let self = this;
    // Redirect from http port to https port
    self.Config.httpServer = HTTP.createServer((req, res) => {
      res.writeHead(301, { "Location": "https://" + req.headers['host'].replace(/:[0-9]+/, '') + (self.Config.httpsPort !== 443 ? ':' + self.Config.httpsPort : '') + req.url });
      res.end();
    }).listen(self.Config.httpPort, self.Config.address, () => { });
  }

  // configure the webserver app
  configureApp (app) {
    app = app || this.app;
    this.Config.preConfigureApp(app);
    this.configureFavIcon(app);
    this.configureParsers(app);
    this.Config.routeConfigureApp(app);
    this.configurePublicStaticRoutes(app);
    this.Config.postConfigureApp(app);
    return this;
  }

  // serve up the favicon.ico
  configureFavIcon (app) {
    app.use(FavIcon(Path.join(__dirname, '..', this.Config.webDirectory, 'favicon.ico')));
  }

  // configure request body parsers
  configureParsers (app) {
    app.use(BodyParser.urlencoded({ extended: true }));
    app.use(BodyParser.json());
    app.use(CookieParser());
  }

  // configure routes for static files
  configurePublicStaticRoutes (app) {
    app.use(Express.static(Path.join(__dirname, '..', this.Config.webDirectory)));
  }

  // start server listening
  listen () {
    return new Promise((resolve, reject) => {
      let port = (this.httpsServer ? this.Config.httpsPort : this.Config.httpPort);
      this.server.listen(port, this.Config.address, () => {
        resolve(port);
      });
    });
  }
}

module.exports = WebServer;
